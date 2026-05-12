<?php
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/../../common/db.php';
$db = getDBConnection();

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = $_GET['action'] ?? null;

try {
    switch ($method) {
        case 'GET':
            if ($action === 'replies') {
                $topic_id = $_GET['topic_id'] ?? null;
                $stmt = $db->prepare("SELECT * FROM replies WHERE topic_id = ? ORDER BY created_at ASC");
                $stmt->execute([$topic_id]);
                echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            } elseif ($id) {
                $stmt = $db->prepare("SELECT * FROM topics WHERE id = ?");
                $stmt->execute([$id]);
                $topic = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$topic) { 
                    http_response_code(404); 
                    echo json_encode(['success' => false]); 
                    exit; 
                }
                echo json_encode(['success' => true, 'data' => $topic]);
            } else {
                $sql = "SELECT * FROM topics";
                $params = [];
                if (!empty($_GET['search'])) {
                    $sql .= " WHERE subject LIKE ? OR message LIKE ? OR author LIKE ?";
                    $term = "%" . $_GET['search'] . "%";
                    $params = [$term, $term, $term];
                }
                $sql .= " ORDER BY created_at DESC";
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            }
            break;

        case 'POST':
            if ($action === 'reply') {
                $check = $db->prepare("SELECT id FROM topics WHERE id = ?");
                $check->execute([$input['topic_id'] ?? 0]);
                if (!$check->fetch()) { 
                    http_response_code(404); 
                    echo json_encode(['success' => false]); 
                    exit; 
                }
                
                $stmt = $db->prepare("INSERT INTO replies (topic_id, text, author) VALUES (?, ?, ?)");
                $stmt->execute([$input['topic_id'], $input['text'], $input['author'] ?? '']);
                http_response_code(201);
                echo json_encode(['success' => true, 'id' => (int)$db->lastInsertId()]);
            } else {
                if (empty($input['subject']) || empty($input['message']) || empty($input['author'])) {
                    http_response_code(400); 
                    echo json_encode(['success' => false]); 
                    exit;
                }
                $stmt = $db->prepare("INSERT INTO topics (subject, message, author) VALUES (?, ?, ?)");
                $stmt->execute([$input['subject'], $input['message'], $input['author']]);
                http_response_code(201);
                echo json_encode(['success' => true, 'id' => (int)$db->lastInsertId()]);
            }
            break;

        case 'PUT':
            $updateId = $input['id'] ?? $id;
            $check = $db->prepare("SELECT id FROM topics WHERE id = ?");
            $check->execute([$updateId]);
            if (!$check->fetch()) { 
                http_response_code(404); 
                echo json_encode(['success' => false]); 
                exit; 
            }

            $stmt = $db->prepare("UPDATE topics SET subject = ?, message = ? WHERE id = ?");
            $stmt->execute([$input['subject'], $input['message'], $updateId]);
            echo json_encode(['success' => true]);
            break;

        case 'DELETE':
            $table = ($action === 'delete_reply') ? 'replies' : 'topics';
            $stmt = $db->prepare("DELETE FROM $table WHERE id = ?");
            $stmt->execute([$id]);
            if ($stmt->rowCount() === 0) { 
                http_response_code(404); 
                echo json_encode(['success' => false]); 
                exit; 
            }
            echo json_encode(['success' => true]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
