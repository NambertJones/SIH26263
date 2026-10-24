#!/usr/bin/env bash
# ==============================================================================
# Render Build Script for APAAR ReconX
# ==============================================================================
set -o errexit

echo "--- Installing Python Backend Dependencies ---"
python -m pip install --upgrade pip
pip install -r backend/requirements.txt

echo "--- Render Build Completed Successfully ---"
