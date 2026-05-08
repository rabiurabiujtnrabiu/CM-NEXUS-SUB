<?php
// Bada izinin kiran wannan file ta ko'ina (Don guje wa CORS issue)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// 1. Bayanan API dinka na Monnify (Na gaske)
$apiKey = "JNAKW6AD98A4CCQKMFG7SHBYS1J2LX9X";
$secretKey = "YOUR_MONNIFY_SECRET_KEY_HERE"; // SAKA SECRET KEY DINKA A NAN (Yana farawa da SEC_)
$contractCode = "1727805127";

// Karbo sunan mai amfani (Username)
$username = isset($_GET['username']) ? preg_replace('/[^a-zA-Z0-9_]/', '', $_GET['username']) : 'rabiujtn';

// 2. Karbo Access Token daga Monnify
$authUrl = "https://api.monnify.com/api/v1/auth/login";
$ch = curl_init($authUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Basic " . base64_encode($apiKey . ":" . $secretKey)
]);

$authResponse = curl_exec($ch);
$authData = json_decode($authResponse, true);
curl_close($ch);

if (!isset($authData['responseBody']['accessToken'])) {
    echo json_encode([
        "requestSuccessful" => false,
        "message" => "Authentication with Monnify failed. Please check your Secret Key."
    ]);
    exit;
}

$accessToken = $authData['responseBody']['accessToken'];

// 3. Kira API din samar da ainihin asusun banki (Reserved Account)
$reserveUrl = "https://api.monnify.com/api/v1/bank-transfer/reserved-accounts";
$postData = [
    "accountReference" => "REF-" . $username . "-" . time(),
    "accountName" => "CM-Nexus-sub-" . $username,
    "currencyCode" => "NGN",
    "contractCode" => $contractCode,
    "customerEmail" => $username . "@cmnexus.com",
    "customerName" => $username,
    "getAllAvailableBanks" => true
];

$ch = curl_init($reserveUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer " . $accessToken,
    "Content-Type: application/json"
]);

$reserveResponse = curl_exec($ch);
curl_close($ch);

// Tura sakamakon zuwa ga shafin HTML dinka
echo $reserveResponse;
?>
