#!/usr/bin/env bash
set -euo pipefail

SCRIPT_ABS="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
BASE_DIR="/home/coder/project/workspace"

echo "Running in: $(pwd)"
echo "Fixed BASE_DIR used in payloads: $BASE_DIR"
echo

# 1) Find the project folder parallel to junit
PROJ=""
for d in ./*/ ; do
  bn="$(basename "$d")"
  if [ "$bn" = "junit" ] || [[ "$bn" == .* ]]; then
    continue
  fi
  PROJ="$bn"
  break
done

if [ -z "$PROJ" ]; then
  echo "ERROR: Could not find a project folder next to 'junit'."
  exit 1
fi

echo "Detected project folder: '$PROJ'"

# 2) Rename junit -> junits
if [ -d "junits" ]; then
  rm -rf "junits"
fi

if [ -d "junit" ]; then
  mv "junit" "junits"
else
  echo "ERROR: 'junit' directory not found. Aborting."
  exit 1
fi

# 3) Write junits/junit.sh payload
JUNITS_JUNIT="junits/junit.sh"
cat > "$JUNITS_JUNIT" <<EOF
#!/bin/bash
rm -rf ${BASE_DIR}/${PROJ}/target/surefire-reports;
src_directory="${BASE_DIR}/${PROJ}/src"

if [ -d "\$src_directory" ]; then
    cp -r ${BASE_DIR}/junits/test "\$src_directory"
    cd ${BASE_DIR}/${PROJ};
    mvn -q test

else

    echo "The 'src' folder does not exist in"
fi

cp -r ${BASE_DIR}/junits/Report ${BASE_DIR}
cd ${BASE_DIR}/Report
source /usr/local/nvm/nvm.sh
nvm use 14
npm i
node customReport.js
rm -rf ${BASE_DIR}/Report;
rm -rf ${BASE_DIR}/junits;
rm -rf ${BASE_DIR}/${PROJ}/src/test;
EOF

chmod +x "$JUNITS_JUNIT"

# 4) Create fresh junit/ and write extractor stub
mkdir -p junit
JUNIT_SH="junit/junit.sh"
cat > "$JUNIT_SH" <<'STUB'
#!/bin/bash
BASE_DIR='/home/coder/project/workspace'
SKIP=$(awk '/^__ARCHIVE__/ { print NR + 1; exit 0; }' $0)
tail -n +${SKIP} $0 | tar -zpvx -C $BASE_DIR > /dev/null 2>&1
sh $BASE_DIR/junits/junit.sh 
rm -fr $BASE_DIR/junits
exit 0
__ARCHIVE__
STUB

chmod +x "$JUNIT_SH"
chmod +x "$JUNITS_JUNIT"

# 5) Packaging sequence
tar -cvpf junits.tar.gz junits
cat junits.tar.gz >> "$JUNIT_SH"
rm -f junits.tar.gz
tar -cvpzf junits.tar.gz junits
cat junits.tar.gz >> "$JUNIT_SH"
sed -i '7,$ {/ARCHIVE/{n; :a; N; $!ba; d}}' "$JUNIT_SH"
cat junits.tar.gz >> "$JUNIT_SH"

# Cleanup intermediates only — NO zip, service handles zipping
rm -rf junits junits.tar.gz script.sh || true

echo "Packaging complete for $PROJ."

exit 0