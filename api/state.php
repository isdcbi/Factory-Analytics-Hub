<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$dataFile = __DIR__ . '/../data/state.json';

function normalizeState($state) {
    // Ensure arrays stay arrays
    $arrKeys = ['dbLine', 'dbPCS'];
    foreach ($arrKeys as $k) {
        if (isset($state[$k]) && !is_array($state[$k])) {
            $state[$k] = [];
        } elseif (!isset($state[$k])) {
            $state[$k] = [];
        } else {
            $state[$k] = array_values($state[$k]);
        }
    }
    // Ensure objects stay objects
    $objKeys = ['lineProcessData', 'orders', 'capacity', 'workCalendar', 'mpParams'];
    foreach ($objKeys as $k) {
        if (!isset($state[$k]) || !is_array($state[$k])) {
            $state[$k] = new stdClass();
        }
    }
    return $state;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!file_exists($dataFile)) {
        $default = [
            'dbLine' => ['Line 1','Line 2','Line 3','Line 4','Line 5','Line 6','Line 7'],
            'lineProcessData' => new stdClass(),
            'dbPCS' => [],
            'orders' => new stdClass(),
            'capacity' => new stdClass(),
            'workCalendar' => new stdClass(),
            'mpParams' => new stdClass(),
        ];
        echo json_encode(['ok' => true, 'state' => $default]);
        exit;
    }
    $raw = file_get_contents($dataFile);
    $state = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Corrupt state file']);
        exit;
    }
    $state = normalizeState($state);
    echo json_encode(['ok' => true, 'state' => $state]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = file_get_contents('php://input');
    $payload = json_decode($body, true);
    if (json_last_error() !== JSON_ERROR_NONE || !isset($payload['state'])) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid payload']);
        exit;
    }
    $state = normalizeState($payload['state']);
    $json = json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    $fp = fopen($dataFile, 'w');
    if ($fp && flock($fp, LOCK_EX)) {
        fwrite($fp, $json);
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        echo json_encode(['ok' => true, 'savedAt' => date('c')]);
    } else {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Cannot write state file']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
