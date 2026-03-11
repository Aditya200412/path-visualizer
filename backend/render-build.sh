#!/usr/bin/env bash
# render-build.sh  – placed in /backend, run by Render during build
set -e

echo "==> Java version"
java -version

echo "==> Maven build"
mvn clean package -DskipTests --no-transfer-progress

echo "==> Build complete"
ls -lh target/*.jar
