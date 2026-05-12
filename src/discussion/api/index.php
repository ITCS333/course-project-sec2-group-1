<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../common/db.php';
$db = getDBConnection();

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = $_GET['action'] ?? null;

try {
    if ($method === 'GET') {
        if ($action === 'replies') {
            $topic_id = (int)$_GET['topic_id'];
            $stmt = $db->prepare("SELECT * FROM replies WHERE topic_id = ? ORDER BY created_at ASC");
            $stmt->execute([$topic_id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } elseif ($id) {
            $stmt = $db->prepare("SELECT * FROM topics WHERE id = ?");
            $stmt->execute([$id]);
            $topic = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($topic) {
                echo json_encode(['success' => true, 'data' => $topic]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Not Found']);
            }
        } else {
            $stmt = $db->query("SELECT * FROM topics ORDER BY created_at DESC");
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        }
    } elseif ($method === 'POST') {
        if ($action === 'reply') {
            if (empty($input['text']) || empty($input['topic_id'])) {
                http_response_code(400);
                echo json_encode(['success' => false]);
                exit;
            }
            $stmt = $db->prepare("INSERT INTO replies (topic_id, text, author) VALUES (?, ?, ?)");
            $stmt->execute([$input['topic_id'], $input['text'], $input['author'] ?? 'Anonymous']);
            http_response_code(201);
            echo json_encode(['success' => true, 'id' => (int)$db->lastInsertId()]);
        } else {
            if (empty($input['subject']) || empty($input['message'])) {
                http_response_code(400);
                echo json_encode(['success' => false]);
                exit;
            }
            $stmt = $db->prepare("INSERT INTO topics (subject, message, author) VALUES (?, ?, ?)");
            $stmt->execute([$input['subject'], $input['message'], $input['author'] ?? 'Anonymous']);
            http_response_code(201);
            echo json_encode(['success' => true, 'id' => (int)$db->lastInsertId()]);
        }
    } elseif ($method === 'DELETE') {
        $table = ($action === 'delete_reply') ? 'replies' : 'topics';
        $stmt = $db->prepare("DELETE FROM $table WHERE id = ?");
        $stmt->execute([$id]);
        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false]);
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false]);
}
