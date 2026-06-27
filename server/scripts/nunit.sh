#!/usr/bin/env bash
set -euo pipefail

# =========================================================
# FINAL NUNIT PACKAGING SCRIPT
# =========================================================

SCRIPT_ABS="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"

echo "Running in: $(pwd)"
echo

# =========================================================
# STEP 1 - FIND PROJECT FOLDER
# =========================================================

PROJ=""

for d in ./*/ ; do
    bn="$(basename "$d")"
    if [ "$bn" = "nunit" ] || [[ "$bn" == .* ]]; then
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
grep -vE '^(Setup|SetUp|TearDown|Dispose)$' | while read testname
do
    echo "        echo \"$testname FAILED\""
done)

# =========================================================
# STEP 4 - CREATE nunits/run.sh
# =========================================================

cat > nunits/run.sh <<EOF
#!/bin/bash

if [ ! -d "/home/coder/project/workspace/dotnetapp" ]
then
    cp -r /home/coder/project/workspace/nunits/dotnetapp /home/coder/project/workspace/
fi

if [ -d "/home/coder/project/workspace/dotnetapp/" ]
then

    echo "project folder present"

    # checking for project folder
    if [ -d "/home/coder/project/workspace/dotnetapp/" ]
    then

        cp -r /home/coder/project/workspace/nunits/test/TestProject /home/coder/project/workspace/

        cp -r /home/coder/project/workspace/nunits/test/dotnetapp.sln /home/coder/project/workspace/dotnetapp/

        cd /home/coder/project/workspace/dotnetapp || exit

        dotnet clean

        dotnet build && dotnet test -l "console;verbosity=normal"

        rm -rf /home/coder/project/workspace/TestProject
        rm -rf /home/coder/project/workspace/nunits
        rm -rf /home/coder/project/workspace/dotnetapp/dotnetapp.sln

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

tar -cvpf nunits.tar.gz nunits
cat nunits.tar.gz >> nunit/run.sh
rm -f nunits.tar.gz
tar -cvpzf nunits.tar.gz nunits
cat nunits.tar.gz >> nunit/run.sh
sed -i '7,$ {/ARCHIVE/{n; :a; N; $!ba; d}}' nunit/run.sh
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