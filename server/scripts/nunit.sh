#!/usr/bin/env bash
set -euo pipefail

# =========================================================
# FINAL NUNIT PACKAGING SCRIPT
# =========================================================

SCRIPT_ABS="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"

echo "Running in: $(pwd)"
echo

# =========================================================
# STEP 1 - FIND PROJECT FOLDER (dynamic)
# =========================================================

PROJ=""

for d in ./*/ ; do

    bn="$(basename "$d")"

    # skip nunit, test, and hidden folders
    if [ "$bn" = "nunit" ] || [ "$bn" = "test" ] || [[ "$bn" == .* ]]; then
        continue
    fi

    PROJ="$bn"
    break

done

if [ -z "$PROJ" ]; then
    echo "ERROR: Project folder not found"
    exit 1
fi

echo "Detected project folder: $PROJ"

# =========================================================
# STEP 2 - RENAME nunit -> nunits
# =========================================================

rm -rf nunits || true

mv nunit nunits

# =========================================================
# STEP 3 - FETCH TEST NAMES
# =========================================================

TEST_FILE="nunits/test/TestProject/UnitTest1.cs"

FAILED_TESTS=$(grep -oP 'public\s+(async\s+Task|void)\s+\K[A-Za-z0-9_]+' "$TEST_FILE" | \
grep -vE '^(Setup|SetUp|OneTimeSetUp|LoadAssembly|TearDown|Dispose)$' | while read testname
do
    echo "        echo \"$testname FAILED\""
done)

# =========================================================
# STEP 3b - FIND .sln FILE NAME (dynamic, no longer assumes
# it matches $PROJ — falls back to $PROJ.sln if none found)
# =========================================================

SLN_PATH="$(find nunits/test -maxdepth 1 -type f -name "*.sln" | head -n 1)"

if [ -n "$SLN_PATH" ]; then
    SLN_NAME="$(basename "$SLN_PATH")"
else
    echo "WARNING: no .sln found under nunits/test — falling back to \$PROJ.sln"
    SLN_NAME="$PROJ.sln"
fi

echo "Detected solution file: $SLN_NAME"

# =========================================================
# STEP 4 - CREATE nunits/run.sh (uses $PROJ and $SLN_NAME dynamically)
# =========================================================

cat > nunits/run.sh <<EOF
#!/bin/bash

if [ ! -d "/home/coder/project/workspace/$PROJ" ]
then
    cp -r /home/coder/project/workspace/nunits/$PROJ /home/coder/project/workspace/
fi

if [ -d "/home/coder/project/workspace/$PROJ/" ]
then

    echo "project folder present"

    # checking for project folder
    if [ -d "/home/coder/project/workspace/$PROJ/" ]
    then

        cp -r /home/coder/project/workspace/nunits/test/TestProject /home/coder/project/workspace/

        cp -r /home/coder/project/workspace/nunits/test/$SLN_NAME /home/coder/project/workspace/$PROJ/

        cd /home/coder/project/workspace/$PROJ || exit

        dotnet clean

        dotnet build && dotnet test -l "console;verbosity=normal"

        rm -rf /home/coder/project/workspace/TestProject
        rm -rf /home/coder/project/workspace/nunits
        rm -rf /home/coder/project/workspace/$PROJ/$SLN_NAME

    else

$FAILED_TESTS

    fi

else

$FAILED_TESTS

fi
EOF

chmod +x nunits/run.sh

# =========================================================
# STEP 5 - CREATE EXTRACTOR STUB
# =========================================================

mkdir -p nunit

cat > nunit/run.sh <<'STUB'
#!/bin/bash

BASE_DIR='/home/coder/project/workspace'

SKIP=$(awk '/^__ARCHIVE__/ { print NR + 1; exit 0; }' $0)

tail -n +${SKIP} $0 | tar -zpvx -C $BASE_DIR > /dev/null 2>&1

sh $BASE_DIR/nunits/run.sh

rm -fr $BASE_DIR/nunits

exit 0

__ARCHIVE__
STUB

chmod +x nunit/run.sh

# =========================================================
# STEP 6 - PACKAGE
# =========================================================

chmod +x nunits/run.sh

# create initial tar
tar -cvpf nunits.tar.gz nunits

# append tar
cat nunits.tar.gz >> nunit/run.sh

# remove initial tar
rm -f nunits.tar.gz

# create compressed tar
tar -cvpzf nunits.tar.gz nunits

# append compressed tar
cat nunits.tar.gz >> nunit/run.sh

# cleanup archive section
sed -i '7,$ {/ARCHIVE/{n; :a; N; $!ba; d}}' nunit/run.sh

# append compressed tar again
cat nunits.tar.gz >> nunit/run.sh

# =========================================================
# STEP 7 - CLEANUP
# =========================================================

rm -rf nunits
rm -rf nunits.tar.gz
rm -rf script.sh || true

cd ..

echo
echo "========================================="
echo "Packaging completed successfully"
echo "Artifact: nunit/run.sh"
echo "========================================="
echo

# =========================================================
# STEP 8 - REMOVE CURRENT SCRIPT
# =========================================================

rm -f "$SCRIPT_ABS" || true

exit 0