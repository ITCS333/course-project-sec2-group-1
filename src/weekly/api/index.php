<?php
/**
 * Weekly Course Breakdown API
 *
 * RESTful API for CRUD operations on weekly course content and discussion
 * comments. Uses PDO to interact with the MySQL database defined in
 * schema.sql.
 */

// ============================================================================
// HEADERS AND INITIALIZATION
// ============================================================================
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
$db = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];
$rawData = file_get_contents('php://input');
$data = json_decode($rawData, true) ?? [];
$action = $_GET['action'] ?? null;
$id = $_GET['id'] ?? null;
$weekId = $_GET['week_id'] ?? null;
$commentId = $_GET['comment_id'] ?? null;

// ============================================================================
// WEEKS FUNCTIONS
// ============================================================================

function getAllWeeks(PDO $db): void
{
    $sql = 'SELECT id, title, start_date, description, links, created_at FROM weeks';
    $params = [];

    $search = trim((string)($_GET['search'] ?? ''));
    if ($search !== '') {
        $sql .= ' WHERE title LIKE :search OR description LIKE :search';
        $params[':search'] = '%' . $search . '%';
    }

    $allowedSorts = ['title', 'start_date'];
    $sort = $_GET['sort'] ?? 'start_date';
    if (!in_array($sort, $allowedSorts, true)) {
        $sort = 'start_date';
    }

    $allowedOrders = ['asc', 'desc'];
    $order = strtolower((string)($_GET['order'] ?? 'asc'));
    if (!in_array($order, $allowedOrders, true)) {
        $order = 'asc';
    }

    $sql .= " ORDER BY {$sort} {$order}";
    $stmt = $db->prepare($sql);

    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value, PDO::PARAM_STR);
    }

    $stmt->execute();
    $weeks = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($weeks as &$week) {
        $week['links'] = json_decode($week['links'], true) ?? [];
    }

    sendResponse(['success' => true, 'data' => $weeks]);
}

function getWeekById(PDO $db, $id): void
{
    if ($id === null || !is_numeric($id)) {
        sendResponse(['success' => false, 'message' => 'Valid week id is required.'], 400);
    }

    $stmt = $db->prepare('SELECT id, title, start_date, description, links, created_at FROM weeks WHERE id = ?');
    $stmt->execute([(int)$id]);
    $week = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($week === false) {
        sendResponse(['success' => false, 'message' => 'Week not found.'], 404);
    }

    $week['links'] = json_decode($week['links'], true) ?? [];
    sendResponse(['success' => true, 'data' => $week]);
}

function createWeek(PDO $db, array $data): void
{
    if (empty($data['title']) || empty($data['start_date'])) {
        sendResponse(['success' => false, 'message' => 'Title and start_date are required.'], 400);
    }

    $title = sanitizeInput((string)$data['title']);
    $start_date = trim((string)$data['start_date']);
    $description = trim((string)($data['description'] ?? ''));

    if (!validateDate($start_date)) {
        sendResponse(['success' => false, 'message' => 'Invalid start_date format. Expected YYYY-MM-DD.'], 400);
    }

    $links = [];
    if (isset($data['links']) && is_array($data['links'])) {
        $links = array_values(array_filter(array_map('trim', $data['links']), fn($item) => $item !== ''));
    }

    $stmt = $db->prepare('INSERT INTO weeks (title, start_date, description, links) VALUES (?, ?, ?, ?)');
    $stmt->execute([$title, $start_date, $description, json_encode($links)]);

    if ($stmt->rowCount() > 0) {
        sendResponse([
            'success' => true,
            'message' => 'Week created successfully.',
            'id' => (int)$db->lastInsertId(),
        ], 201);
    }

    sendResponse(['success' => false, 'message' => 'Failed to create week.'], 500);
}

function updateWeek(PDO $db, array $data): void
{
    if (empty($data['id']) || !is_numeric($data['id'])) {
        sendResponse(['success' => false, 'message' => 'Valid id is required.'], 400);
    }

    $id = (int)$data['id'];
    $check = $db->prepare('SELECT id FROM weeks WHERE id = ?');
    $check->execute([$id]);
    if ($check->fetch(PDO::FETCH_ASSOC) === false) {
        sendResponse(['success' => false, 'message' => 'Week not found.'], 404);
    }

    $fields = [];
    $params = [];

    if (array_key_exists('title', $data)) {
        $fields[] = 'title = ?';
        $params[] = sanitizeInput((string)$data['title']);
    }

    if (array_key_exists('start_date', $data)) {
        $start_date = trim((string)$data['start_date']);
        if (!validateDate($start_date)) {
            sendResponse(['success' => false, 'message' => 'Invalid start_date format. Expected YYYY-MM-DD.'], 400);
        }
        $fields[] = 'start_date = ?';
        $params[] = $start_date;
    }

    if (array_key_exists('description', $data)) {
        $fields[] = 'description = ?';
        $params[] = trim((string)$data['description']);
    }

    if (array_key_exists('links', $data)) {
        $links = [];
        if (is_array($data['links'])) {
            $links = array_values(array_filter(array_map('trim', $data['links']), fn($item) => $item !== ''));
        }
        $fields[] = 'links = ?';
        $params[] = json_encode($links);
    }

    if (empty($fields)) {
        sendResponse(['success' => false, 'message' => 'No fields to update.'], 400);
    }

    $sql = 'UPDATE weeks SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $params[] = $id;
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    sendResponse(['success' => true, 'message' => 'Week updated successfully.']);
}

function deleteWeek(PDO $db, $id): void
{
    if ($id === null || !is_numeric($id)) {
        sendResponse(['success' => false, 'message' => 'Valid week id is required.'], 400);
    }

    $check = $db->prepare('SELECT id FROM weeks WHERE id = ?');
    $check->execute([(int)$id]);
    if ($check->fetch(PDO::FETCH_ASSOC) === false) {
        sendResponse(['success' => false, 'message' => 'Week not found.'], 404);
    }

    $stmt = $db->prepare('DELETE FROM weeks WHERE id = ?');
    $stmt->execute([(int)$id]);

    if ($stmt->rowCount() > 0) {
        sendResponse(['success' => true, 'message' => 'Week deleted successfully.']);
    }

    sendResponse(['success' => false, 'message' => 'Failed to delete week.'], 500);
}

// ============================================================================
// COMMENTS FUNCTIONS
// ============================================================================

function getCommentsByWeek(PDO $db, $weekId): void
{
    if ($weekId === null || !is_numeric($weekId)) {
        sendResponse(['success' => false, 'message' => 'Valid week_id is required.'], 400);
    }

    $stmt = $db->prepare('SELECT id, week_id, author, text, created_at FROM comments_week WHERE week_id = ? ORDER BY created_at ASC');
    $stmt->execute([(int)$weekId]);
    $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    sendResponse(['success' => true, 'data' => $comments]);
}

function createComment(PDO $db, array $data): void
{
    $week_id = $data['week_id'] ?? null;
    $author = trim((string)($data['author'] ?? ''));
    $text = trim((string)($data['text'] ?? ''));

    if ($week_id === null || !is_numeric($week_id) || $author === '' || $text === '') {
        sendResponse(['success' => false, 'message' => 'week_id, author, and text are required.'], 400);
    }

    $check = $db->prepare('SELECT id FROM weeks WHERE id = ?');
    $check->execute([(int)$week_id]);
    if ($check->fetch(PDO::FETCH_ASSOC) === false) {
        sendResponse(['success' => false, 'message' => 'Week not found.'], 404);
    }

    $stmt = $db->prepare('INSERT INTO comments_week (week_id, author, text) VALUES (?, ?, ?)');
    $stmt->execute([(int)$week_id, sanitizeInput($author), sanitizeInput($text)]);

    if ($stmt->rowCount() > 0) {
        $commentId = (int)$db->lastInsertId();
        $fetch = $db->prepare('SELECT id, week_id, author, text, created_at FROM comments_week WHERE id = ?');
        $fetch->execute([$commentId]);
        $comment = $fetch->fetch(PDO::FETCH_ASSOC);

        sendResponse([
            'success' => true,
            'message' => 'Comment created successfully.',
            'id' => $commentId,
            'data' => $comment,
        ], 201);
    }

    sendResponse(['success' => false, 'message' => 'Failed to create comment.'], 500);
}

function deleteComment(PDO $db, $commentId): void
{
    if ($commentId === null || !is_numeric($commentId)) {
        sendResponse(['success' => false, 'message' => 'Valid comment id is required.'], 400);
    }

    $check = $db->prepare('SELECT id FROM comments_week WHERE id = ?');
    $check->execute([(int)$commentId]);
    if ($check->fetch(PDO::FETCH_ASSOC) === false) {
        sendResponse(['success' => false, 'message' => 'Comment not found.'], 404);
    }

    $stmt = $db->prepare('DELETE FROM comments_week WHERE id = ?');
    $stmt->execute([(int)$commentId]);

    if ($stmt->rowCount() > 0) {
        sendResponse(['success' => true, 'message' => 'Comment deleted successfully.']);
    }

    sendResponse(['success' => false, 'message' => 'Failed to delete comment.'], 500);
}

// ============================================================================
// MAIN REQUEST ROUTER
// ============================================================================

try {
    if ($method === 'GET') {
        if ($action === 'comments') {
            getCommentsByWeek($db, $weekId);
        } elseif ($id !== null) {
            getWeekById($db, $id);
        } else {
            getAllWeeks($db);
        }
    } elseif ($method === 'POST') {
        if ($action === 'comment') {
            createComment($db, $data);
        } else {
            createWeek($db, $data);
        }
    } elseif ($method === 'PUT') {
        updateWeek($db, $data);
    } elseif ($method === 'DELETE') {
        if ($action === 'delete_comment') {
            deleteComment($db, $commentId);
        } else {
            deleteWeek($db, $id);
        }
    } else {
        sendResponse(['success' => false, 'message' => 'Method not allowed.'], 405);
    }
} catch (PDOException $e) {
    error_log($e->getMessage());
    sendResponse(['success' => false, 'message' => 'Internal server error.'], 500);
} catch (Exception $e) {
    error_log($e->getMessage());
    sendResponse(['success' => false, 'message' => 'Internal server error.'], 500);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function sendResponse(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

function validateDate(string $date): bool
{
    $d = DateTime::createFromFormat('Y-m-d', $date);
    return $d && $d->format('Y-m-d') === $date;
}

function sanitizeInput(string $data): string
{
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}
