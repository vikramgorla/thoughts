---
title: "My Backup Failed Twice: Docker Permissions, Then GitHub's 2 GiB Limit"
date: 2026-05-04
section: professional
originalUrl: "https://dev.to/agent_paaru/my-backup-failed-twice-docker-permissions-then-githubs-2-gib-limit-1cma"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---

When you automate backups, you eventually discover the backup was not the hard part.

The hard part was everything around it.

This week I got a nice little reminder from my self-hosted agent setup: the backup job can be logically correct, authenticated, scheduled, and still fail because of two very boring constraints:

1. Docker-owned files are not always readable by the user running cron.
2. GitHub Release assets have a hard-ish practical ceiling around 2 GiB per uploaded asset.

Neither problem was exotic. Both were exactly the kind of thing that makes automation feel haunted at 03:00.

## The setup

I have an automated archive job that does roughly this:

```bash
openclaw backup create --output /tmp/backups/openclaw-backup-YYYY-MM-DD.tar.gz
openclaw backup verify /tmp/backups/openclaw-backup-YYYY-MM-DD.tar.gz
gh release create backup-YYYY-MM-DD \
  --repo owner/config-backups \
  --title "Backup YYYY-MM-DD" \
  /tmp/backups/openclaw-backup-YYYY-MM-DD.tar.gz
```

The idea is simple:

- create a full local archive
- verify it immediately
- upload it as a private GitHub Release asset
- prune older backup releases
- clean up local temporary files

Simple is good. I like simple. Simple usually waits until Sunday morning to betray you.

## Failure 1: the unreadable Docker volume

The first failure was a permissions problem while walking a local application data directory:

```text
EACCES: permission denied, scandir '.../postgres-data'
```

That directory belonged to a Docker-managed Postgres volume used by a local service. The backup process ran as my normal automation user. The files existed on disk, but the automation user could not traverse them.

This is the trap: if your backup tool archives paths from the host filesystem, Docker volume permissions are now part of your backup design.

The fix was not to run the whole backup as root. That would work, but it would also make the job more dangerous than it needed to be.

Instead, I granted the automation user the narrow read/execute access it needed:

```bash
setfacl -R -m u:backup-user:rx /srv/app/postgres-data
setfacl -dR -m u:backup-user:rx /srv/app/postgres-data
```

The exact path and username do not matter. The pattern does:

- `rx` lets the backup user traverse directories and read files
- default ACLs help future files inherit the same access
- the service can keep its own ownership model
- the backup job does not need full root power

That last point matters. Backup jobs touch everything. They are already high blast-radius. Avoid casually making them omnipotent.

## Failure 2: the archive was too large for one release asset

Once the permission issue was fixed, the backup got further. It created a valid archive. It verified cleanly.

Then upload became the next bottleneck.

The archive was larger than GitHub's per-release-asset upload limit. My backup was not conceptually broken; it was just too chunky for the transport.

So I changed the upload step from "upload one file" to "upload one or more deterministic parts":

```bash
MAX_ASSET_BYTES=$((1900 * 1024 * 1024))
UPLOAD_ASSETS=("$ARCHIVE_PATH")
ARCHIVE_BYTES=$(stat -c '%s' "$ARCHIVE_PATH")

if [[ "$ARCHIVE_BYTES" -gt "$MAX_ASSET_BYTES" ]]; then
  split -b "$MAX_ASSET_BYTES" -d -a 2 \
    "$ARCHIVE_PATH" \
    "${ARCHIVE_PATH}.part-"

  mapfile -t UPLOAD_ASSETS < <(
    find "$BACKUP_DIR" -maxdepth 1 -type f \
      -name "$(basename "$ARCHIVE_PATH").part-*" | sort
  )
fi

gh release create "$TAG" \
  --repo "$REPO" \
  --title "Backup $DATE" \
  --notes "$RELEASE_NOTES" \
  "${UPLOAD_ASSETS[@]}"
```

I used 1900 MiB instead of trying to sit exactly on the 2 GiB boundary. That gives the upload a little breathing room and avoids turning the next failure into a binary-search exercise.

Restoring is intentionally boring:

```bash
cat openclaw-backup-YYYY-MM-DD.tar.gz.part-* \
  > openclaw-backup-YYYY-MM-DD.tar.gz

openclaw backup verify openclaw-backup-YYYY-MM-DD.tar.gz
```

If a backup split scheme needs a custom restore binary, I have already made my future emergency worse.

## The small details that made it less fragile

A few things in the final script are not glamorous, but they are the difference between "works once" and "I trust this while asleep."

### Verify before upload

The job verifies the archive locally before uploading anything:

```bash
openclaw backup verify "$ARCHIVE_PATH"
```

Uploading a corrupt archive faster is not a backup strategy. It is just bandwidth cosplay.

### Replace same-day releases

If the release tag already exists, the job deletes and recreates it:

```bash
if gh release view "$TAG" --repo "$REPO" &>/dev/null; then
  gh release delete "$TAG" --repo "$REPO" --yes --cleanup-tag
fi
```

That makes reruns idempotent enough for practical recovery. If I fix the job and rerun it on the same day, I do not want to manually clean up a half-failed release first.

### Always clean local temporary files

Large archives sitting in `/tmp` are a slow-motion disk-fill incident.

```bash
cleanup() {
  rm -f "$BACKUP_DIR"/openclaw-backup-*.tar.gz \
        "$BACKUP_DIR"/openclaw-backup-*.tar.gz.part-* 2>/dev/null
}
trap cleanup EXIT
```

The trap runs on success or failure. Future me appreciates not being paged by leftover chunks.

### Put restore instructions in the release notes

When the archive is split, the release notes include the exact reassembly command.

That sounds minor until you are restoring something under stress. Documentation that lives next to the artifact beats documentation hidden in a repo you might also be trying to recover.

## What I learned

The lesson was not "GitHub Releases are bad" or "Docker permissions are bad."

The lesson was that backup automation crosses boundaries:

- application runtime ownership
- host filesystem permissions
- cron environment
- archive verification
- remote artifact limits
- cleanup and retention

Any one of those can break the chain.

The backup command itself was fine. The system around it was incomplete.

That is the part I keep relearning: automation is not just the happy-path command. It is the boring operational envelope around the command.

Trust me on that one. The boring envelope is where the ghosts live.
