#!/usr/bin/env python3
"""Refresh the saved YouTube playlist; leave the last good copy intact on failure."""
import json
from pathlib import Path
import re
import subprocess

PLAYLIST = 'https://www.youtube.com/playlist?list=PLMB0vcDGOVNc'
DESTINATION = Path(__file__).resolve().parents[1] / 'rehearsal-videos/videos.js'
PREFIX = 'window.PUFFS_REHEARSAL_VIDEOS = '
TITLE = re.compile(r'^.+?\s+(Loyal Cast|True Cast)\s*\((?:pp?\.?\s*|pages?\s*)?(\d+)(?:\s*[-–—]\s*(\d+))?\)\s*$', re.I)


def main():
    result = subprocess.run(
        ['yt-dlp', '--flat-playlist', '--dump-single-json', '--ignore-config', PLAYLIST],
        check=True, capture_output=True, text=True, timeout=180,
    )
    playlist = json.loads(result.stdout)
    entries = playlist.get('entries')
    if not entries:
        raise ValueError('Playlist returned no videos; preserving the existing list.')
    videos = []
    ids = set()
    for entry in entries:
        video_id = entry.get('id', '')
        title = entry.get('title', '').strip()
        match = TITLE.fullmatch(title)
        if not re.fullmatch(r'[\w-]{11}', video_id) or not match:
            raise ValueError(f'Invalid or unavailable video: {video_id} {title!r}; preserving the existing list.')
        start, end = int(match[2]), int(match[3] or match[2])
        if not 1 <= start <= end <= 101:
            raise ValueError(f'Invalid script page range: {title!r}')
        if video_id not in ids:
            videos.append({'id': video_id, 'title': title})
            ids.add(video_id)
    current = json.loads(DESTINATION.read_text().removeprefix(PREFIX).rstrip().removesuffix(';'))
    by_id = lambda items: sorted(items, key=lambda video: video['id'])
    if current['playlistUrl'] == PLAYLIST and by_id(current['videos']) == by_id(videos):
        print(f'No changes: {len(videos)} rehearsal videos.')
        return
    updated = {'playlistUrl': PLAYLIST, 'videos': videos}
    temporary = DESTINATION.with_suffix('.tmp')
    temporary.write_text(PREFIX + json.dumps(updated, indent=2, ensure_ascii=False) + ';\n')
    temporary.replace(DESTINATION)
    print(f'Updated playlist: {len(videos)} rehearsal videos.')


if __name__ == '__main__':
    main()
