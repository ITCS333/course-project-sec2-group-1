<?php
// ======================================================
// HEADERS & INITIALIZATION
// ======================================================

header("Content-Type: application/json");
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

$rawData = file_get_contents("php://input");
$data = json_decode($rawData, true) ?? [];

$action  = $_GET['action']   ?? null;
$id      = $_GET['id']       ?? null;
$topicId = $_GET['topic_id'] ?? null;


// ======================================================
// TOPICS FUNCTIONS
// ======================================================

function getAllTopics(PDO $db): void
{
    $query = "SELECT id, subject, message, author, created_at FROM topics";

    if (!empty($_GET['search'])) {
        $query .= " WHERE subject LIKE :search OR message LIKE :search OR author LIKE :search";
    }

    $allowedSort = ['subject', 'author', 'created_at'];
    $sort = $_GET['sort'] ?? 'created_at';
    if (!in_array($sort, $allowedSort)) {
        $sort = 'created_at';
    }

    $order = strtolower($_GET['order'] ?? 'desc');
    if (!in_array($order, ['asc', 'desc'])) {
        $order = 'desc';
    }

    $query .= " ORDER BY $sort $order";

    $stmt = $db->prepare($query);

    if (!empty($_GET['search'])) {
        $search = "%" . $_GET['search'] . "%";
        $stmt->bindParam(':search', $search);
    }

    $stmt->execute();
    $topics = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendResponse(['success' => true, 'data' => $topics]);
}


function getTopicById(PDO $db, $id): void
{
    if (!$id || !is_numeric($id)) {
        sendResponse(['success' => false, 'message' => 'Invalid ID'], 400);
    }

    $stmt = $db->prepare("SELECT * FROM topics WHERE id = ?");
    $stmt->execute([$id]);

    $topic = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($topic) {
        sendResponse(['success' => true, 'data' => $topic]);
    } else {
        sendResponse(['success' => false, 'message' => 'Not found'], 404);
    }
}


function createTopic(PDO $db, array $data): void
{
    if (empty($data['subject']) || empty($data['message']) || empty($data['author'])) {
        sendResponse(['success' => false, 'message' => 'Missing fields'], 400);
    }

    $subject = sanitizeInput($data['subject']);
    $message = sanitizeInput($data['message']);
    $author  = sanitizeInput($data['author']);

    $stmt = $db->prepare("INSERT INTO topics (subject, message, author) VALUES (?, ?, ?)");
    $stmt->execute([$subject, $message, $author]);

    if ($stmt->rowCount() > 0) {
        sendResponse([
            'success' => true,
            'message' => 'Topic created',
            'id' => $db->lastInsertId()
        ], 201);
    }

    sendResponse(['success' => false], 500);
}


function updateTopic(PDO $db, array $data): void
{
    if (empty($data['id'])) {
        sendResponse(['success' => false, 'message' => 'ID required'], 400);
    }

    $stmt = $db->prepare("SELECT id FROM topics WHERE id = ?");
    $stmt->execute([$data['id']]);

    if (!$stmt->fetch()) {
        sendResponse(['success' => false, 'message' => 'Not found'], 404);
    }

    $fields = [];
    $values = [];

    if (!empty($data['subject'])) {
        $fields[] = "subject = ?";
        $values[] = sanitizeInput($data['subject']);
    }

    if (!empty($data['message'])) {
        $fields[] = "message = ?";
        $values[] = sanitizeInput($data['message']);
    }

    if (empty($fields)) {
        sendResponse(['success' => false, 'message' => 'Nothing to update'], 400);
    }

    $values[] = $data['id'];

    $sql = "UPDATE topics SET " . implode(", ", $fields) . " WHERE id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute($values);

    sendResponse(['success' => true, 'message' => 'Updated']);
}


function deleteTopic(PDO $db, $id): void
{
    if (!$id || !is_numeric($id)) {
        sendResponse(['success' => false], 400);
    }

    $stmt = $db->prepare("SELECT id FROM topics WHERE id = ?");
    $stmt->execute([$id]);

    if (!$stmt->fetch()) {
        sendResponse(['success' => false, 'message' => 'Not found'], 404);
    }

    $stmt = $db->prepare("DELETE FROM topics WHERE id = ?");
    $stmt->execute([$id]);

    sendResponse(['success' => true, 'message' => 'Deleted']);
}


// ======================================================
// REPLIES FUNCTIONS
// ======================================================

function getRepliesByTopicId(PDO $db, $topicId): void
{
    if (!$topicId || !is_numeric($topicId)) {
        sendResponse(['success' => false], 400);
    }

    $stmt = $db->prepare("SELECT * FROM replies WHERE topic_id = ? ORDER BY created_at ASC");
    $stmt->execute([$topicId]);

    $replies = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendResponse(['success' => true, 'data' => $replies]);
}


function createReply(PDO $db, array $data): void
{
    if (empty($data['topic_id']) || empty($data['text']) || empty($data['author'])) {
        sendResponse(['success' => false], 400);
    }

    if (!is_numeric($data['topic_id'])) {
        sendResponse(['success' => false], 400);
    }

    $stmt = $db->prepare("SELECT id FROM topics WHERE id = ?");
    $stmt->execute([$data['topic_id']]);

    if (!$stmt->fetch()) {
        sendResponse(['success' => false, 'message' => 'Topic not found'], 404);
    }

    $text   = sanitizeInput($data['text']);
    $author = sanitizeInput($data['author']);

    $stmt = $db->prepare("INSERT INTO replies (topic_id, text, author) VALUES (?, ?, ?)");
    $stmt->execute([$data['topic_id'], $text, $author]);

    sendResponse([
        'success' => true,
        'id' => $db->lastInsertId()
    ], 201);
}


function deleteReply(PDO $db, $replyId): void
{
    if (!$replyId || !is_numeric($replyId)) {
        sendResponse(['success' => false], 400);
    }

    $stmt = $db->prepare("SELECT id FROM replies WHERE id = ?");
    $stmt->execute([$replyId]);

    if (!$stmt->fetch()) {
        sendResponse(['success' => false], 404);
    }

    $stmt = $db->prepare("DELETE FROM replies WHERE id = ?");
    $stmt->execute([$replyId]);

    sendResponse(['success' => true]);
}


// ======================================================
// ROUTER
// ======================================================

try {

    if ($method === 'GET') {

        if ($action === 'replies') {
            getRepliesByTopicId($db, $topicId);
        } elseif ($id) {
            getTopicById($db, $id);
        } else {
            getAllTopics($db);
        }

    } elseif ($method === 'POST') {

        if ($action === 'reply') {
            createReply($db, $data);
        } else {
            createTopic($db, $data);
        }

    } elseif ($method === 'PUT') {

        updateTopic($db, $data);

    } elseif ($method === 'DELETE') {

        if ($action === 'delete_reply') {
            deleteReply($db, $id);
        } else {
            deleteTopic($db, $id);
        }

    } else {
        sendResponse(['success' => false], 405);
    }

} catch (PDOException $e) {
    error_log($e->getMessage());
    sendResponse(['success' => false, 'message' => 'Server error'], 500);

} catch (Exception $e) {
    error_log($e->getMessage());
    sendResponse(['success' => false], 500);
}


// ======================================================
// HELPER FUNCTIONS
// ======================================================

function sendResponse(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

function sanitizeInput(string $data): string
{
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}
