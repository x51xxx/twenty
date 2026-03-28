SELECT 'CREATE DATABASE casdoor'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'casdoor')\gexec
