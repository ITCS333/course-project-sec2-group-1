<?php

declare(strict_types=1);

session_start();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['email']) || !isset($data['password'])) {
    echo json_encode(['success' => false]);
    exit;
}

$email = trim($data['email']);
$password = trim($data['password']);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false]);
    exit;
}

if (strlen($password) < 8) {
    echo json_encode(['success' => false]);
    exit;
}

$users = [
    [
        'id' => 1,
        'name' => 'Admin User',
        'email' => 'admin@uob.edu.bh',
        'password' => 'password123',
        'is_admin' => 1
    ],
    [
        'id' => 2,
        'name' => 'Ali Hassan',
        'email' => '202101234@stu.uob.edu.bh',
        'password' => 'password123',
        'is_admin' => 0
    ]
];

foreach ($users as $user) {
    if ($user['email'] === $email && $user['password'] === $password) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['is_admin'] = $user['is_admin'];

        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'is_admin' => $user['is_admin']
            ]
        ]);
        exit;
    }
}

echo json_encode(['success' => false]);
exit;
