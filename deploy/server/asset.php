<?php
declare(strict_types=1);
header('Cache-Control: private, no-store');
header('Referrer-Policy: no-referrer');
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD', 'OPTIONS'], true)) { http_response_code(405); exit; }
$files = [
    'renderer' => ['/js/vendor/realistic-3d/renderer.js', 'application/javascript'],
    'amaka' => ['/assets/realistic-3d/amaka.glb', 'model/gltf-binary'],
    'tunde' => ['/assets/realistic-3d/tunde.glb', 'model/gltf-binary'],
];
$file = $_GET['file'] ?? '';
if (!is_string($file) || !isset($files[$file])) { http_response_code(404); exit; }
$ticket = $_GET['ticket'] ?? '';
if (!is_string($ticket) || !preg_match('/^(\d{10})\.([a-f0-9]{64})$/D', $ticket, $parts)) { http_response_code(401); exit; }
$expires = (int)$parts[1];
$secret = trim(file_get_contents('/etc/animationstage3d/asset-signing.key'));
if ($expires < time() || $expires > time() + 86460 || !hash_equals(hash_hmac('sha256', 'preview-assets:' . $parts[1], $secret), $parts[2])) { http_response_code(401); exit; }
// This capability grants only the fixed renderer and two public-preset models.
// It grants no editor, account, filesystem, project or upload access.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
header('Content-Type: ' . $files[$file][1]);
header('X-Accel-Redirect: /__3d_asset' . $files[$file][0]);
