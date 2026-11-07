import Foundation
import AVFoundation
@main struct PublicExport {
 static func main() async throws {
  let folder=URL(fileURLWithPath:CommandLine.arguments[1]),silent=AVURLAsset(url:folder.appendingPathComponent("silent-video.mp4")),score=AVURLAsset(url:folder.appendingPathComponent("original-score.wav"))
  guard try await silent.loadTracks(withMediaType:.audio).isEmpty else {fatalError("Public picture source unexpectedly contains audio")}
  let aac=folder.appendingPathComponent("public-original-score.m4a");try? FileManager.default.removeItem(at:aac)
  let audioExport=AVAssetExportSession(asset:score,presetName:AVAssetExportPresetAppleM4A)!;try await audioExport.export(to:aac,as:.m4a)
  let composition=AVMutableComposition(),sound=AVURLAsset(url:aac),range=CMTimeRange(start:.zero,duration:CMTime(seconds:180,preferredTimescale:600))
  let v=try await silent.loadTracks(withMediaType:.video),a=try await sound.loadTracks(withMediaType:.audio)
  try composition.addMutableTrack(withMediaType:.video,preferredTrackID:kCMPersistentTrackID_Invalid)!.insertTimeRange(range,of:v[0],at:.zero)
  try composition.addMutableTrack(withMediaType:.audio,preferredTrackID:kCMPersistentTrackID_Invalid)!.insertTimeRange(range,of:a[0],at:.zero)
  let target=folder.appendingPathComponent("Wave-Protocol-Demo.mp4");try FileManager.default.removeItem(at:target)
  let export=AVAssetExportSession(asset:composition,presetName:AVAssetExportPresetPassthrough)!;export.shouldOptimizeForNetworkUse=true;try await export.export(to:target,as:.mp4)
  print("Public export: picture + authored score only; no Apple System Voice or Live Captions audio.")
 }
}
