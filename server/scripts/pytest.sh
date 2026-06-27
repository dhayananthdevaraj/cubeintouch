#!/bin/bash
set -euo pipefail

SCRIPT_ABS="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"

echo "=== Preparing & packaging project in: $(pwd) ==="

# PRE-STEP: Remove existing Project/tests.py if present
if [ -f Project/tests.py ]; then
  echo "Removing existing Project/tests.py"
  rm -f Project/tests.py
else
  echo "Project/tests.py not found, skipping removal"
fi

# Step 1: Ensure pytests/ exists
if [ ! -d pytests ]; then
  if [ -d pytest ]; then
    echo "Copying pytest/ -> pytests/"
    rm -rf pytests || true
    cp -a pytest pytests
  else
    echo "No pytest/ directory found. Creating empty pytests/."
    mkdir -p pytests
  fi
else
  echo "pytests/ already exists"
fi

# Step 2: Create pytests/run.sh with payload
echo "Writing pytests/run.sh"
cat > pytests/run.sh <<'PAYLOAD'
#!/bin/bash
cp /home/coder/project/workspace/pytests/tests.py /home/coder/project/workspace/Project/
cd /home/coder/project/workspace/Project
pip install pytest
python3 -m pytest tests.py -v
rm -rf /home/coder/project/workspace/Project/tests.py
PAYLOAD

chmod +x pytests/run.sh

# Step 3: Remove pytest/tests.py
if [ -f pytest/tests.py ]; then
  echo "Removing pytest/tests.py"
  rm -f pytest/tests.py
else
  echo "pytest/tests.py not found, skipping removal"
fi

# Step 4: Replace pytest/run.sh with extractor stub
echo "Replacing pytest/run.sh with extractor stub"
cat > pytest/run.sh <<'STUB'
#!/bin/bash
BASE_DIR='/home/coder/project/workspace'
SKIP=$(awk '/^__ARCHIVE__/ { print NR + 1; exit 0; }' $0)
tail -n +${SKIP} $0 | tar -zpvx -C $BASE_DIR > /dev/null 2>&1
sh $BASE_DIR/pytests/run.sh 
rm -fr $BASE_DIR/pytests
exit 0
__ARCHIVE__
STUB

chmod +x pytest/run.sh
chmod +x pytests/run.sh

# Step 5: Packaging sequence
tar -cvpf pytests.tar.gz pytests
cat pytests.tar.gz >> pytest/run.sh
rm -f pytests.tar.gz
tar -cvpzf pytests.tar.gz pytests
cat pytests.tar.gz >> pytest/run.sh
sed -i '7,$ {/ARCHIVE/{n; :a; N; $!ba; d}}' pytest/run.sh
cat pytests.tar.gz >> pytest/run.sh

# Step 10: Cleanup
rm -rf pytests pytests.tar.gz script.sh || true

# Step 11: Move up one directory
cd ..

echo "=== Done. pytest/run.sh is the self-extracting artifact. ==="

if [ -f "$SCRIPT_ABS" ]; then
  echo "Removing script file: $SCRIPT_ABS"
  rm -f "$SCRIPT_ABS" || true
fi