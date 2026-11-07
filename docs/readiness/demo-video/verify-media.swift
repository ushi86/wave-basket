import Foundation
import AVFoundation
import CoreMedia
struct Invalid:Error { let message:String }
func fourcc(_ n:FourCharCode)->String {String(bytes:[UInt8((n>>24)&255),UInt8((n>>16)&255),UInt8((n>>8)&255),UInt8(n&255)],encoding:.ascii) ?? "unknown"}
@main struct Verify {
 static func main() async throws {
  let url=URL(fileURLWithPath:CommandLine.arguments[1]),asset=AVURLAsset(url:URL(fileURLWithPath:CommandLine.arguments[1]))
  let duration=try await asset.load(.duration).seconds,videos=try await asset.loadTracks(withMediaType:.video),audios=try await asset.loadTracks(withMediaType:.audio)
  guard videos.count==1,audios.count==1 else {throw Invalid(message:"Expected one picture track and one audio track")}
  let size=try await videos[0].load(.naturalSize),fps=try await videos[0].load(.nominalFrameRate)
  let vd=try await videos[0].load(.formatDescriptions),ad=try await audios[0].load(.formatDescriptions)
  guard abs(duration-180)<0.01,size.width==1920,size.height==1080,abs(fps-24)<0.01 else {throw Invalid(message:"Wrong duration, dimensions or frame rate")}
  let reader=try AVAssetReader(asset:asset),output=AVAssetReaderTrackOutput(track:audios[0],outputSettings:[AVFormatIDKey:kAudioFormatLinearPCM,AVLinearPCMIsFloatKey:true,AVLinearPCMBitDepthKey:32,AVLinearPCMIsNonInterleaved:false])
  reader.add(output);guard reader.startReading() else {throw Invalid(message:"Audio decode failed")};var count=0;var squared=0.0;var peak=0.0
  while let sample=output.copyNextSampleBuffer() {if let data=CMSampleBufferGetDataBuffer(sample) {let bytes=CMBlockBufferGetDataLength(data);var values=[Float](repeating:0,count:bytes/4);let copied=values.withUnsafeMutableBytes{CMBlockBufferCopyDataBytes(data,atOffset:0,dataLength:bytes,destination:$0.baseAddress!)};guard copied==kCMBlockBufferNoErr else {throw Invalid(message:"Audio data unavailable")};for f in values {let v=Double(f);squared+=v*v;peak=max(peak,abs(v))};count+=values.count}}
  guard reader.status == .completed,count>0,squared>0,peak<1.001 else {throw Invalid(message:"Missing, silent, clipped or incompletely decoded audio")}
  let report:[String:Any]=["file":url.path,"durationSeconds":duration,"width":size.width,"height":size.height,"fps":fps,"videoCodec":fourcc(CMFormatDescriptionGetMediaSubType(vd[0])),"audioCodec":fourcc(CMFormatDescriptionGetMediaSubType(ad[0])),"audioDecodedToEnd":true,"audioSampleValues":count,"audioRms":sqrt(squared/Double(count)),"audioPeak":peak,"scope":"Technical media checks only. Visual keyframes reviewed separately; not live transaction or full privacy acceptance."]
  let data=try JSONSerialization.data(withJSONObject:report,options:[.prettyPrinted,.sortedKeys]);try data.write(to:URL(fileURLWithPath:CommandLine.arguments[2]));print(String(data:data,encoding:.utf8)!)
 }
}
