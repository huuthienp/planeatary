#!/bin/bash

# If there are 2 or more arguments provided, exits with an error message
if [ "$#" -ge 2 ]; then
    echo "Error: Too many arguments provided. Usage: $(basename "$0") [optional_path]"
    exit 1
fi

# Check if an argument is provided
# Set the root directory
if [ -n "$1" ]; then
    root_dir="$1"
else
    root_dir=$PWD
fi

# HTML
# Find all index.html files recursively
find "$root_dir" -type f -name "*.html" | while read -r file; do
    # Get the parent directory name
    parent_dir=$(basename "$(dirname "$file")")

    # Create new filename
    new_filename="${parent_dir}.html"

    # Move and rename the file
    mv "$file" "$root_dir/$new_filename"

    echo "Moved and renamed: $file -> $root_dir/$new_filename"
done

# CSS
css_filename="concat.css"
# Check if $css_filename already exists
if [ -f "$root_dir/$css_filename" ]; then
    echo "Error: $root_dir/$css_filename already exists. Please remove or rename it before running this script."
    exit 1
fi

# Find all CSS files, concatenate them, and output to $css_filename
find "$root_dir" -type f -name "*.css" ! -name "$css_filename" | sort | xargs cat > "$root_dir/$css_filename"

# Check if the concatenation was successful
if [ $? -ne 0 ]; then
    echo "Error: Failed to concatenate CSS files."
    exit 1
fi

# Delete all other CSS files except $css_filename
find "$root_dir" -name "*.css" -type f ! -name "$css_filename" -delete

echo "All CSS files have been concatenated into $root_dir/$css_filename and other CSS files have been deleted."

# IMAGES
# Create images directory if it doesn't exist
mkdir -p "$root_dir/images"

# Function to calculate MD5 hash of a file
calculate_hash() {
    md5sum "$1" | awk '{print $1}'
}

# Find all image files
find "$root_dir" -type f \( -name "*.png" -o -name "*.jpg" \) | while read -r file; do
    filename=$(basename "$file")
    extension="${filename##*.}"
    name="${filename%.*}"
    hash=$(calculate_hash "$file")
    
    # Check if a file with the same name already exists in the images directory
    if [ -f "$root_dir/images/$filename" ]; then
        existing_hash=$(calculate_hash "$root_dir/images/$filename")
        if [ "$hash" != "$existing_hash" ]; then
            # If hashes are different, find a new name
            counter=1
            while [ -f "$root_dir/images/${name}_${counter}.${extension}" ]; do
                counter=$((counter + 1))
            done
            mv "$file" "$root_dir/images/${name}_${counter}.${extension}"
        else
            # If hashes are the same, skip this file
            rm "$file"
        fi
    else
        # If no file with the same name exists, move it directly
        mv "$file" "$root_dir/images/$filename"
    fi
done

echo "Image processing complete. All images have been moved to $root_dir/images."
