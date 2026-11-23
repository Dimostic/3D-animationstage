$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
$synth = New-Object -ComObject SAPI.SpVoice
$voices = $synth.GetVoices()
if ($request.mode -eq 'voices') {
    $items = @()
    for ($i = 0; $i -lt $voices.Count; $i++) {
        $token = $voices.Item($i)
        $items += @{ id = $token.Id; name = $token.GetDescription() }
    }
    [Console]::Out.Write((ConvertTo-Json -InputObject $items -Compress))
    exit
}
$chosen = $null
for ($i = 0; $i -lt $voices.Count; $i++) { if ($voices.Item($i).Id -eq $request.voice) { $chosen = $voices.Item($i) } }
if ($null -eq $chosen) { throw 'Choose an installed Windows voice.' }
$synth.Voice = $chosen
$synth.Rate = [int]$request.rate
$stream = New-Object -ComObject SAPI.SpFileStream
try {
    $stream.Format.Type = 22 # 22.05 kHz, 16-bit, mono PCM
    $stream.Open([string]$request.output, 3, $false)
    $synth.AudioOutputStream = $stream
    # SVSFIsNotXML: speak user text literally, never interpret SSML or file references.
    [void]$synth.Speak([string]$request.text, 16)
} finally { $stream.Close() }
[Console]::Out.Write('ok')
