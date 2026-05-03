<?php
/**
 * Local development stub for db.php
 *
 * This file is OVERWRITTEN by the test framework during test runs.
 * It exists only to satisfy the IDE (Intelephense) locally.
 * In production, replace the credentials below with your real MySQL details.
 */
function getDBConnection(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $host     = getenv('DB_HOST')     ?: '127.0.0.1';
        $port     = getenv('DB_PORT')     ?: '3306';
        $dbName   = getenv('DB_DATABASE') ?: getenv('DB_NAME') ?: 'course';
        $username = getenv('DB_USERNAME') ?: 'root';
        $password = getenv('DB_PASSWORD') ?: '';

        $pdo = new PDO(
            "mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4",
            $username,
            $password
        );
        $pdo->setAttribute(PDO::ATTR_ERRMODE,            PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    }
    return $pdo;
}
