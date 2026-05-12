<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../../common/db.php';
$db = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents('php://input'), true) ?? [];
$id = $_GET['id'] ?? null;
$action = $_GET['action'] ?? null;

try {
    if ($method === 'GET') {
        if ($action === 'replies') {
            $stmt = $db->prepare("SELECT * FROM replies WHERE topic_id = ?");
            $stmt->execute([$_GET['topic_id']]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } elseif ($id) {
            $stmt = $db->prepare("SELECT * FROM topics WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetch(PDO::FETCH_ASSOC)]);
        } else {
            $stmt = $db->query("SELECT * FROM topics ORDER BY created_at DESC");
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        }
    } elseif ($method === 'POST') {
        if ($action === 'reply') {
            $stmt = $db->prepare("INSERT INTO replies (topic_id, text, author) VALUES (?, ?, ?)");
            $stmt->execute([$data['topic_id'], $data['text'], $data['author']]);
            echo json_encode(['success' => true, 'data' => ['id' => $db->lastInsertId()]]);
        } else {
            $stmt = $db->prepare("INSERT INTO topics (subject, message, author) VALUES (?, ?, ?)");
            $stmt->execute([$data['subject'], $data['message'], $data['author']]);
            echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
        }
    } elseif ($method === 'DELETE') {
        $table = ($action === 'delete_reply') ? 'replies' : 'topics';
        $stmt = $db->prepare("DELETE FROM $table WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false]);
}
