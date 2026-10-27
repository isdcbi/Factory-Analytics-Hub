<?php
// Backend modul Standardized Work (standardized-work.html, sw/storage.js).
// Disimpan terpisah dari state FAH (data/state.json) di data/sw-state.json.
//   GET  → { ok: true, state: {...} | null }   (null = server belum punya data)
//   POST ← { state: {...} } → { ok: true, savedAt: "..." }
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$dataDir  = __DIR__ . '/../data';
$dataFile = $dataDir . '/sw-state.json';

// JSON di-decode sebagai objek (bukan array asosiatif) supaya {} tetap {} saat disimpan ulang;
// dengan array asosiatif, objek kosong seperti settings.processOrders berubah jadi [] dan
// isinya hilang saat frontend menambah key ke array tersebut.
function normalizeState($s) {
    if (!is_object($s)) $s = new stdClass();
    if (!isset($s->observations) || !is_array($s->observations)) $s->observations = [];
    if (!property_exists($s, 'activeObservationId')) $s->activeObservationId = null;
    if (!isset($s->drafts) || !is_object($s->drafts)) $s->drafts = (object) ['observasi' => null];
    foreach (['tskLayouts', 'manPowerMap', 'yamazumiScenarios', 'tskpSheets'] as $k) {
        if (!isset($s->$k) || !is_object($s->$k)) $s->$k = new stdClass();
    }
    if (!isset($s->settings) || !is_object($s->settings)) {
        $s->settings = (object) ['taktTime' => 60, 'processOrders' => new stdClass()];
    }
    if (!isset($s->settings->processOrders) || !is_object($s->settings->processOrders)) {
        $s->settings->processOrders = new stdClass();
    }
    if (!isset($s->meta) || !is_object($s->meta)) $s->meta = new stdClass();
    return $s;
}

function fail($code, $msg) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!file_exists($dataFile)) {
        echo json_encode(['ok' => true, 'state' => null]);
        exit;
    }
    $fp = fopen($dataFile, 'r');
    if (!$fp) fail(500, 'Cannot read state file');
    flock($fp, LOCK_SH);
    $raw = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    if (trim($raw) === '') {
        echo json_encode(['ok' => true, 'state' => null]);
        exit;
    }
    $state = json_decode($raw);
    if (json_last_error() !== JSON_ERROR_NONE) fail(500, 'Corrupt state file');
    echo json_encode(['ok' => true, 'state' => normalizeState($state)], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = json_decode(file_get_contents('php://input'));
    if (json_last_error() !== JSON_ERROR_NONE || !is_object($payload) || !isset($payload->state) || !is_object($payload->state)) {
        fail(400, 'Field "state" harus berupa object.');
    }
    $state = normalizeState($payload->state);
    $savedAt = gmdate('Y-m-d\TH:i:s.v\Z');
    $state->meta->savedAt = $savedAt;
    if (empty($state->meta->updatedAt)) $state->meta->updatedAt = $savedAt;

    $json = json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) fail(400, 'State tidak bisa disimpan: ' . json_last_error_msg());

    if (!is_dir($dataDir) && !@mkdir($dataDir, 0775, true)) fail(500, 'Cannot create data directory');
    // 'c' = buka tanpa mengosongkan file; dikosongkan setelah lock didapat (GET memakai LOCK_SH).
    $fp = fopen($dataFile, 'c');
    if (!$fp || !flock($fp, LOCK_EX)) fail(500, 'Cannot write state file');
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, $json);
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    echo json_encode(['ok' => true, 'savedAt' => $savedAt]);
    exit;
}

fail(405, 'Method not allowed');
