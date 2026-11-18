---
name: qnap-smb-repair
description: >
  Diagnose and fix the recurring "Windows can't connect to the QNAP NAS / mapped
  drives won't reconnect" problem on VincentNAS (TVS-951N, 192.168.0.60). Triggers:
  "can't connect to NAS", "Y:/Z: drive disconnected", "local device name is already
  in use", "SMB not working", "NAS drives broken", or any QNAP SMB outage. The usual
  root cause is a NAS reboot wiping the non-persistent .samba bind-mount workaround
  (the slot-2 disk is failing, so Samba's database was relocated to a healthy disk).
---

# QNAP NAS — SMB Repair SOP (VincentNAS / TVS-951N)

When Windows suddenly can't reach the NAS file shares (Y: = `\\192.168.0.60\workspace`,
Z: = `\\192.168.0.60\Multimedia`), this is almost always the same root cause. Work the
steps in order. See `~/.claude/memories/qnap-nas.md` for the full hardware/disk context.

## Root cause (the usual one)

- Slot-2 disk (Toshiba 1TB, **DataVol1** / `/share/CACHEDEV1_DATA`) is **failing** — read-only.
- Samba's database (`.samba`) lived on that disk, so it was **relocated** to the healthy
  8TB disk and **bind-mounted** back into place:
  `/share/CACHEDEV2_DATA/.samba_relocated` → `/share/CACHEDEV1_DATA/.samba`
- **That bind mount is NOT persistent across reboots.** Any NAS reboot (power, firmware
  auto-update, crash) wipes it → `smbd` can't read its database → **`smbd` fails to start**
  → TCP **445 is closed** → Windows can't connect and mapped drives show red ✗.

## Step 1 — Confirm the fingerprint (from Windows, PowerShell)

```powershell
Test-Connection 192.168.0.60 -Count 2                      # ping should WORK
Test-NetConnection 192.168.0.60 -Port 22  -WarningAction SilentlyContinue   # SSH  -> True
Test-NetConnection 192.168.0.60 -Port 5001 -WarningAction SilentlyContinue  # QTS  -> True
Test-NetConnection 192.168.0.60 -Port 445 -WarningAction SilentlyContinue   # SMB  -> FALSE = the bug
net use                                                    # Y:/Z: Disconnected/Unavailable
```

**Tell-tale pattern:** ping + SSH(22) + web(5001) all succeed, but **only 139/445 (SMB) fail.**
That selective pattern = SMB service down on the NAS, *not* a client firewall/VPN. (A local
VPN/proxy — Surfshark, Clash Verge, Cloudflare WARP — *can* also block 445, but if 22/5001
work to the NAS, the VPN is not the cause. Don't disable the VPN chasing a red herring.)

Optional corroboration that the NAS rebooted: open QTS web UI; a cluster of boot-time
notices, a "Get Started" wizard, and a "Default admin password changed to Cloud Key" event
all timestamped together = it just rebooted (→ bind mount gone).

## Step 2 — Get a shell on the NAS

Local SSH key `~/.ssh/id_ed25519` is **passphrase-protected**. Pitfalls:
- Windows PATH often resolves **Git's MSYS ssh**, not Windows OpenSSH. The Windows
  `ssh-agent` service only serves `C:\Windows\System32\OpenSSH\ssh.exe`.
- If the passphrase is unknown, **use password auth** (simplest, always works):
  ```
  ssh -o PubkeyAuthentication=no admin@192.168.0.60
  ```
- The admin password **auto-rotates to the Cloud Key on reboot**. Get the current one from
  QTS: **Control Panel → System → Security → Cloud Key**. (Last-known static one is in the
  memory file but a reboot likely invalidated it.)
- On login you land in QNAP's **"Console Management" numbered menu** — press **`Q`** then
  Enter to drop to the real `#` shell. **Never** pick 3 (factory reset) or 6/7 (reboot).

If Claude needs its own non-interactive access (to automate), have the user paste this once
in their shell to authorize a throwaway key Claude generated, then connect with
`ssh -i <key> -o IdentitiesOnly=yes`:
```sh
K='<claude-public-key>'; H=$(getent passwd admin | cut -d: -f6)
for d in "$H/.ssh" /root/.ssh /share/CACHEDEV2_DATA/.ssh-admin; do
  mkdir -p "$d"; echo "$K" >> "$d/authorized_keys"; chmod 700 "$d"; chmod 600 "$d/authorized_keys"
done; echo ADDED
```
(Remove the key from those files afterward.)

## Step 3 — The fix (run at the `#` prompt)

```sh
mount --bind /share/CACHEDEV2_DATA/.samba_relocated /share/CACHEDEV1_DATA/.samba
/etc/init.d/smb.sh restart
sleep 2
ps | grep '[s]mbd'                # expect several smbd processes
netstat -ltn | grep ':445'        # expect 0.0.0.0:445 LISTEN and :::445 LISTEN
```

Success = `smbd` processes present **and** `:445 ... LISTEN`.

## Step 4 — Reconnect Windows drives

```powershell
Test-NetConnection 192.168.0.60 -Port 445 -WarningAction SilentlyContinue   # now True
# Y: usually auto-reconnects once 445 is reachable; if a drive is stuck:
net use Z: /delete /y
net use Z: \\192.168.0.60\Multimedia      # uses cached creds; same server as Y:
net use                                   # both should read OK
```
If "local device name is already in use": `net use <L>: /delete /y` clears the ghost mapping,
then remap. Stale entries also live in `HKCU\Network\<DriveLetter>`.
Note: Z:/Multimedia is on the **failing** DataVol1 — it may be read-only or absent.

## Step 5 — Make it reboot-proof (stops the recurrence)

The real cure is adding the bind mount to QNAP's startup script so it self-heals on boot.
First inspect the current `autorun.sh` (it already contains the Tailscale auto-start — append,
don't overwrite). `autorun.sh` lives on the config DOM partition `/dev/mmcblk0p6`.
```sh
getcfg Misc Autorun -f /etc/config/uLinux.conf          # must be TRUE/enabled
mkdir -p /tmp/cfg_dom && mount /dev/mmcblk0p6 /tmp/cfg_dom
cat /tmp/cfg_dom/autorun.sh                              # review existing (Tailscale) hook
# append, idempotently:
grep -q samba_relocated /tmp/cfg_dom/autorun.sh || cat >> /tmp/cfg_dom/autorun.sh <<'EOF'

# Re-apply relocated Samba DB bind mount (DataVol1 failing) then start SMB
mount --bind /share/CACHEDEV2_DATA/.samba_relocated /share/CACHEDEV1_DATA/.samba
/etc/init.d/smb.sh restart
EOF
chmod 755 /tmp/cfg_dom/autorun.sh
umount /tmp/cfg_dom
```
Also ensure "Run user defined processes during startup" (autorun) is enabled in
Control Panel → System → Hardware (or it won't run). Permanent fix = replace the dying
slot-2 disk and move `.samba` back onto healthy storage.

## Step 6 — Prevent the surprise reboot

A pending **firmware auto-update with auto-restart** can reboot the NAS and re-break SMB.
Disable it: **Control Panel → System → Firmware Update → Auto Update** → turn off automatic
download/install (set to notify-only). Don't run firmware updates until Step 5 persistence is
in place (or be ready to re-run Step 3 after any reboot).

## One-shot recap (if you just want it back NOW)

```sh
ssh -o PubkeyAuthentication=no admin@192.168.0.60     # password = Cloud Key; press Q for shell
mount --bind /share/CACHEDEV2_DATA/.samba_relocated /share/CACHEDEV1_DATA/.samba; /etc/init.d/smb.sh restart; sleep 2; ps | grep '[s]mbd'; netstat -ltn | grep ':445'
```
