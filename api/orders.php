<?php
ini_set('memory_limit', '256M');
ini_set('max_execution_time', 60);
ob_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { ob_end_clean(); exit(0); }

$dataDir = __DIR__ . '/../data/orders';
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

function periodFile($period, $dir) {
    if (!preg_match('/^\d{4}-\d{2}$/', $period)) return null;
    return $dir . '/' . $period . '.json';
}

// GET ?period=YYYY-MM  → { ok, data: [...] }
// GET                  → { ok, periods: ["YYYY-MM", ...] }
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $period = isset($_GET['period']) ? trim($_GET['period']) : '';
    if ($period !== '') {
        $file = periodFile($period, $dataDir);
        if (!$file) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Format periode tidak valid']);
            exit;
        }
        if (!file_exists($file)) {
            echo json_encode(['ok' => true, 'data' => []]);
            exit;
        }
        $raw    = file_get_contents($file);
        $parsed = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            echo json_encode(['ok' => true, 'data' => []]);
            exit;
        }
        echo json_encode(['ok' => true, 'data' => isset($parsed['data']) ? $parsed['data'] : []]);
        exit;
    }

    // List all periods
    $files   = glob($dataDir . '/*.json');
    $periods = [];
    if ($files) {
        foreach ($files as $f) {
            $periods[] = basename($f, '.json');
        }
        rsort($periods);
    }
    echo json_encode(['ok' => true, 'periods' => $periods]);
    exit;
}

// POST { period, data: [...] }  → { ok, count, savedAt }
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body    = file_get_contents('php://input');
    $payload = json_decode($body, true);
    if (json_last_error() !== JSON_ERROR_NONE || !isset($payload['period']) || !isset($payload['data'])) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Payload tidak valid']);
        exit;
    }
    $file = periodFile($payload['period'], $dataDir);
    if (!$file) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Format periode tidak valid']);
        exit;
    }
    $json = json_encode(['data' => $payload['data']], JSON_UNESCAPED_UNICODE);
    $fp   = fopen($file, 'w');
    if ($fp && flock($fp, LOCK_EX)) {
        fwrite($fp, $json);
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        echo json_encode(['ok' => true, 'count' => count($payload['data']), 'savedAt' => date('c')]);
    } else {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Tidak dapat menulis file data']);
    }
    exit;
}

// DELETE ?period=YYYY-MM  → { ok }
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $period = isset($_GET['period']) ? trim($_GET['period']) : '';
    $file   = periodFile($period, $dataDir);
    if (!$file) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Format periode tidak valid']);
        exit;
    }
    if (file_exists($file)) {
        unlink($file);
    }
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Method tidak diizinkan']);
