#!/bin/bash
for dir in public/travel/*/; do
    for img in "$dir"*.jpg; do
        echo "Processing: $img"
        convert "$img" -auto-orient -resize 1920x1080\> -quality 85 -strip "$img"
    done
done