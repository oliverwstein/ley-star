import os
import shutil
from pathlib import Path

def create_text_files():
    # Create text_files directory if it doesn't exist
    output_dir = Path('text_files')
    output_dir.mkdir(exist_ok=True)
    
    # Walk through all directories and subdirectories
    for root, dirs, files in os.walk('.'):
        # Skip the text_files directory itself
        if 'text_files' in root:
            continue
            
        # Process each .svelte file
        for file in files:
            if file.endswith('.svelte'):
                # Get the full path of the source file
                source_path = Path(root) / file
                
                # Create corresponding path in text_files directory
                # Convert the directory structure to a flat naming scheme
                relative_path = Path(root).relative_to('.')
                if relative_path == Path('.'):
                    new_filename = f"{file[:-7]}.txt"  # Remove .svelte extension
                else:
                    # Include directory structure in filename
                    new_filename = f"{relative_path}_{file[:-7]}".replace('/', '_').replace('\\', '_') + '.txt'
                    
                output_path = output_dir / new_filename
                
                # Copy the contents
                try:
                    with open(source_path, 'r', encoding='utf-8') as source:
                        content = source.read()
                    with open(output_path, 'w', encoding='utf-8') as target:
                        target.write(content)
                    print(f"Created {output_path}")
                except Exception as e:
                    print(f"Error processing {source_path}: {str(e)}")

if __name__ == "__main__":
    create_text_files()