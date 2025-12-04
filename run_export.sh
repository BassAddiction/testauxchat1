#!/bin/bash

echo "Installing Python dependencies..."
pip install psycopg2-binary

echo ""
echo "Running database export..."
python3 export_database.py

echo ""
echo "Export complete! Check timeweb_database_import.sql"
