<?php
declare(strict_types=1);
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD'], true)) { http_response_code(405); exit; }
$nonce = base64_encode(random_bytes(24));
$configDirectory = getenv('STUDIO3D_CONFIG_DIR') ?: '/etc/animationstage3d';
$secret = trim(file_get_contents($configDirectory . '/asset-signing.key'));
$expires = (string)(time() + 86400);
$ticket = $expires . '.' . hash_hmac('sha256', 'preview-assets:' . $expires, $secret);
$manifest = json_decode(file_get_contents(dirname(__DIR__) . '/manifest.json'), true, 512, JSON_THROW_ON_ERROR);
$assetVersion = (string)$manifest['release'];
$policy = json_decode(file_get_contents(__DIR__ . '/stage-policy.json'), true, 512, JSON_THROW_ON_ERROR);
header('Content-Type: text/html; charset=utf-8');
header('Content-Security-Policy: ' . str_replace('{$nonce}', $nonce, implode('; ', $policy)));
header('Cache-Control: private, no-store');
header('X-Frame-Options: DENY');
if ($_SERVER['REQUEST_METHOD'] === 'HEAD') exit;
$html = file_get_contents(dirname(__DIR__) . '/dist/index.html');
$html = preg_replace('/<script\b/i', '<script nonce="' . $nonce . '"', $html);
$bootstrap = '<script nonce="' . $nonce . '">window.__appAssetVersion=' . json_encode($assetVersion, JSON_HEX_TAG | JSON_HEX_AMP) . ';window.__STUDIO3D_PRIVATE_PREVIEW=true;window.__STUDIO3D_ASSET_TICKET=' . json_encode($ticket, JSON_HEX_TAG | JSON_HEX_AMP) . ';</script>';
echo str_replace('<head>', '<head>' . $bootstrap, $html);
