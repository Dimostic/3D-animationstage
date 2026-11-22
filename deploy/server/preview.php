<?php
declare(strict_types=1);
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD'], true)) { http_response_code(405); exit; }
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: private, no-store');
header('Content-Security-Policy: ' . json_decode(file_get_contents(__DIR__ . '/preview-policy.json'), true, 512, JSON_THROW_ON_ERROR));
header('X-Frame-Options: SAMEORIGIN');
if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') readfile(__DIR__ . '/preview-shell.html');
