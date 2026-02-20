# PiBitStreamer

PiBitStreamer is a web platform that lets multiple users **claim a physical FPGA board**, upload a bitstream, and program it through a backend service that talks to connected Digilent/FTDI-based programmers via **openFPGALoader**.

It is designed for a lab / shared environment where multiple Cmod A7 boards are plugged into a host machine (ex: a Raspberry Pi) and users interact with them remotely through a browser.

---

## High-Level Architecture

- **Frontend (React + Redux + Ant Design Pro)**
  - Displays available boards
  - Lets a user register and claim a board (lease)
  - Provides a board page to upload a bitstream and flash it
  - Shows a countdown timer for remaining lease time

- **Backend (Node.js + Express + SQLite)**
  - Scans USB devices using `openFPGALoader --scan-usb`
  - Keeps an inventory of boards in SQLite
  - Enforces a lease system (READY / BUSY / FLASHING / ERROR)
  - Accepts file uploads and programs the correct board via openFPGALoader
  - Prunes stale boards that were unplugged

- **Hardware Layer**
  - Multiple Digilent programmers (FTDI2232 / VID:PID 0403:6010)
  - Boards are uniquely pinned by **FTDI serial number** (stable across replug)
  - Board programming is done via `openFPGALoader` inside a privileged Docker container

---

## Repo Layout (Typical)

```

backend/
controllers/
routes/
services/
BoardManager.js
hardware/
OpenFPGABoardProgrammer.js
detectOpenFPGABoards.js (helper / optional)
config/
adminDb.js
uploads/ (runtime)
frontend/
src/
pages/
Home.tsx
BoardPage.tsx
features/
boards/
user/
docker-compose.yml

````

---

## Core Concepts

### Board States

Boards in the DB move between these states:

- `READY`    → available to claim
- `BUSY`     → claimed by a user (active lease)
- `FLASHING` → actively being programmed
- `ERROR`    → last operation failed (admin may force-release)
  
Leases automatically expire and are cleaned up by the backend’s lease timer.

### Board Identity (Important)

Boards are discovered using:

```bash
openFPGALoader --scan-usb
````

Output looks like:

```
Bus device vid:pid       probe type      manufacturer serial               product
001 063    0x0403:0x6010 FTDI2232        Digilent     210183636801         Digilent USB Device
```

PiBitStreamer uses the **FTDI serial** to create stable IDs like:

- `Digilent_USB_Device-210183636801`

This matters because USB bus/dev numbers can change after unplug/reboot.

---

## Backend

### Express Routes

Main API routes (student-facing):

- `GET  /api/boards`
  Returns all boards and their state/lease info.

- `POST /api/users/register`
  Creates or updates a student user record.

- `POST /api/boards/:id/claim`
  Claims a board and starts/extends a lease.

- `POST /api/boards/:id/upload`
  Uploads bitstream file (`.bit`, `.svf`, `.sv`) and returns a `jobId`.

- `POST /api/boards/:id/flash`
  Programs the uploaded bitstream using the stored `jobId`.

- `POST /api/boards/:id/release`
  Releases the board early.

Admin routes (protected):

- `POST /api/admin/login`
- `GET  /api/boards/admin`
- `POST /api/boards/:id/force-release`
- `POST /api/boards/:id/reboot`

### BoardManager (backend/services/BoardManager.js)

BoardManager does 4 key jobs:

1. **Detect boards on startup**

   - Runs `openFPGALoader --scan-usb`
   - Inserts new boards into SQLite
   - Updates existing boards’ metadata (bus/dev/serial/etc.)

2. **Prune unplugged boards**

   - If a board exists in DB but is no longer detected, it is deleted (or optionally marked stale).
   - This fixes the “stale board stays forever” bug when hardware is unplugged.

3. **Lease management**

   - On claim, sets:

     - `status = BUSY`
     - `lease_since`, `lease_until`
   - Background timer checks and auto-releases expired leases

4. **Job management**

   - Upload creates a `jobId`
   - Flash uses the `jobId` → calls Programmer

### Programmer (backend/hardware/OpenFPGABoardProgrammer.js)

This component is responsible for actually invoking `openFPGALoader` for:

- Flash/program bitstream
- Reboot/reset board

It pins the correct physical target using:

- `--ftdi-serial <serial>` (preferred)
- fallback: `--busdev-num <bus:dev>`

Example command used for programming:

```bash
openFPGALoader --cable digilent --ftdi-serial 210183636801 -b cmoda7_35t -f -r file.bit
```

#### Board Profile Name (common pitfall)

Inside the container, `openFPGALoader --list-boards | grep -i cmod` might show:

```
cmoda7_35t
cmod_s7
```

If you use a profile name not present (ex: `cmoda7_15t`), programming fails with:

```
Error: cannot find board 'cmoda7_15t'
```

So your backend must use the board profile that exists inside the container.

---

## Frontend

### Home Page (frontend/src/pages/Home.tsx)

Home page responsibilities:

- Loads boards list from backend (`fetchBoards`)
- Hydrates user identity from localStorage (`hydrateFromStorage`)
- Determines if user has an **active lease**
- If active lease exists → auto-redirect to `/board/:id`
- If saved board is stale (lease expired or admin released) → clears local user.board

#### Important reload bug (fixed)

On reload, boards list may not be loaded yet, so the app must **not clear** user.board until board data has loaded at least once. Otherwise the user “loses” the lease locally even though backend still has it.

### Board Page (frontend/src/pages/BoardPage.tsx)

Board page responsibilities:

- Shows board ID + status badge
- Shows lease countdown timer
- Allows uploading a bitstream only if:

  - user is registered
  - user.board matches this board
  - lease is active
  - board exists in backend state

Upload flow:

1. `uploadBitstream({ boardId, file })`
2. `flashBoard({ boardId, jobId })`
3. Show success/error

Exit flow:

- “Back” triggers a confirmation modal
- Calls backend `releaseBoard`
- Clears local user.board and returns home

---

## Docker / Deployment

### docker-compose.yml (backend)

Backend container requires access to USB + udev:

- `privileged: true`
- `/dev:/dev`
- `/run/udev:/run/udev:ro`

Example (as used):

```yaml
services:
  backend:
    privileged: true
    volumes:
      - /dev:/dev
      - /run/udev:/run/udev:ro
```

This allows `openFPGALoader` inside the container to open FTDI devices.

### Build Commands

Builds and created the backend and frontend image for the application for amd64 and arm64 architectures, assumes you have docker engine installed and have access the
artifact registry used in the example.

#### Backend build

```bash
cd backend/
docker buildx build   --platform linux/amd64,linux/arm64   -f Dockerfile.backend   -t calcium.atkin.engineer/alberta2514640/pibitstreamer-backend:latest   --push   .
```

#### Frontend build

```bash
cd pibitstream/
docker buildx build   --platform linux/amd64,linux/arm64   -f Dockerfile.frontend   -t calcium.atkin.engineer/alberta2514640/pibitstreamer-frontend:latest   --push   .
```

### Common Container Gotchas

- `lsusb: not found` inside container does **not** break openFPGALoader,
  but it can break your helper scripts if you depend on `lsusb` for detection.
- If you use `lsusb` in scripts, install `usbutils` in the image.

---

## How Programming Works (End-to-End)

1. Backend detects boards:

   - `openFPGALoader --scan-usb`
2. Backend stores board rows in SQLite:

   - ID, status, lease, serial, etc.
3. User opens frontend and registers:

   - `/api/users/register`
4. User claims board:

   - `/api/boards/:id/claim`
5. User uploads bitstream:

   - `/api/boards/:id/upload`
6. User flashes:

   - `/api/boards/:id/flash`
7. Backend runs openFPGALoader pinned to that board’s serial:

   - `--ftdi-serial <serial>`
8. Board is reset/rebooted:

   - `-r`
9. Board returns to READY when released or lease expires.

---

## SRAM vs Flash Programming

The backend supports a mode switch:

- **Flash + reset** (default): `-f -r`

  - persists after power cycle
- **SRAM only** (optional): no `-f`

  - faster and safer for repeated testing
  - lost on power cycle/reset

This can be exposed later as a UI option if desired.

---

## Troubleshooting

### “unable to open ftdi device” inside container

- Ensure backend service is:

  - `privileged: true`
  - has `/dev:/dev`
  - has `/run/udev:/run/udev:ro`

### “cannot find board 'cmoda7_15t'”

- Run inside container:

  ```bash
  openFPGALoader --list-boards | grep -i cmod
  ```

- Use the profile that exists (ex: `cmoda7_35t`).

### Stale boards remain after unplug

- Ensure BoardManager calls `_pruneStaleBoards(detectedIds)` after detection.

### Lease “disappears” after page reload

- Frontend must not clear `user.board` until boards data has loaded at least once.

---

## Future Improvements

- Add a UI toggle for **SRAM-only** vs **Flash** programming
- Show last flash logs per board
- Add a “Rescan boards” endpoint/button
- Better concurrency controls (queue programming per board)
- Persistent audit logs of who flashed what and when
