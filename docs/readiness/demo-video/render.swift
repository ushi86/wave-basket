// First-party macOS media frameworks only. Composites real CUA captures; never drives a browser.
import Foundation
import AppKit
import AVFoundation
import CoreVideo
import ImageIO

struct Scene: Codable {
 var duration: Double
 let title: String
 let kicker: String
 let partner: String
 let status: String
 let images: [String]
 let bullets: [String]
 let narration: String
 let audio: String
}
struct Plan: Codable {
 let title: String
 let width: Int
 let height: Int
 let fps: Int
 let duration: Double
 let output: String
 var scenes: [Scene]
 let credits: String
}
struct Failure: Error { let message: String }
func require(_ condition: Bool, _ message: String) throws { if !condition { throw Failure(message: message) } }
func color(_ hex: UInt32, _ alpha: CGFloat = 1) -> NSColor {
 NSColor(srgbRed: CGFloat((hex >> 16) & 255)/255, green: CGFloat((hex >> 8) & 255)/255, blue: CGFloat(hex & 255)/255, alpha: alpha)
}
let ink = color(0x090f20), paper = color(0xf5f7ff), blue = color(0x4774ff), muted = color(0x9bafcf)
func rect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> CGRect { CGRect(x:x,y:1080-y-h,width:w,height:h) }
func text(_ value: String, _ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ size: CGFloat, _ weight: NSFont.Weight = .regular, _ c: NSColor = paper, _ alignment: NSTextAlignment = .left) {
 let para = NSMutableParagraphStyle(); para.alignment = alignment; para.lineBreakMode = .byWordWrapping; para.lineSpacing = size * 0.14
 let attrs: [NSAttributedString.Key:Any] = [.font:NSFont.systemFont(ofSize:size,weight:weight), .foregroundColor:c, .paragraphStyle:para]
 NSAttributedString(string:value,attributes:attrs).draw(with:rect(x,y,w,h),options:[.usesLineFragmentOrigin,.usesFontLeading])
}
func round(_ ctx: CGContext, _ r: CGRect, _ radius: CGFloat, _ fill: NSColor) {
 ctx.setFillColor(fill.cgColor); ctx.addPath(CGPath(roundedRect:r,cornerWidth:radius,cornerHeight:radius,transform:nil)); ctx.fillPath()
}
func wave(_ ctx: CGContext, _ x: CGFloat, _ y: CGFloat, _ scale: CGFloat, _ c: NSColor) {
 ctx.saveGState();ctx.setStrokeColor(c.cgColor);ctx.setLineWidth(3*scale);ctx.setLineCap(.round)
 for row in 0..<3 {let yy = 1080-y-CGFloat(row)*10*scale;ctx.move(to:CGPoint(x:x,y:yy));ctx.addCurve(to:CGPoint(x:x+44*scale,y:yy),control1:CGPoint(x:x+16*scale,y:yy+14*scale),control2:CGPoint(x:x+27*scale,y:yy-14*scale));ctx.strokePath()};ctx.restoreGState()
}
func splitCues(_ narration: String) -> [String] {
 let sentences = narration.components(separatedBy: ". ")
 return sentences.enumerated().map { index, sentence in sentence.hasSuffix(".") ? sentence : sentence + "." }
}
func imageAt(_ path: String) throws -> CGImage {
 guard let source=CGImageSourceCreateWithURL(URL(fileURLWithPath:path) as CFURL,nil),let img=CGImageSourceCreateImageAtIndex(source,0,nil) else {throw Failure(message:"Missing actual capture: \(path)")};return img
}
func drawImage(_ ctx: CGContext,_ img: CGImage,_ time: Double,_ alpha: CGFloat) {
 let frame=rect(565,194,1283,731);ctx.saveGState();ctx.setAlpha(alpha)
 ctx.addPath(CGPath(roundedRect:frame,cornerWidth:16,cornerHeight:16,transform:nil));ctx.clip()
 let u=CGFloat(min(1,max(0,time)));let scale=max(frame.width/CGFloat(img.width), frame.height/CGFloat(img.height))*(1+0.018*u)
 let width=CGFloat(img.width)*scale,height=CGFloat(img.height)*scale
 ctx.interpolationQuality = .high;ctx.draw(img,in:CGRect(x:frame.midX-width/2,y:frame.midY-height/2,width:width,height:height));ctx.restoreGState()
}
func drawFrame(_ ctx: CGContext,_ scene: Scene,_ idx: Int,_ local: Double,_ global: Double,_ duration: Double,_ audioDuration: Double,_ images:[CGImage]) {
 ctx.setFillColor(ink.cgColor);ctx.fill(CGRect(x:0,y:0,width:1920,height:1080))
 NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(cgContext:ctx,flipped:false)
 // Pure decoration: authored waves, not charts or data.
 ctx.setStrokeColor(color(0x263c6a,0.5).cgColor);ctx.setLineWidth(1)
 for row in 0..<8 {let yy=970+CGFloat(row)*22;ctx.move(to:CGPoint(x:900,y:1080-yy));ctx.addCurve(to:CGPoint(x:1980,y:1080-yy+90),control1:CGPoint(x:1300,y:1080-yy+130+CGFloat(sin(global/8))*18),control2:CGPoint(x:1620,y:1080-yy-160));ctx.strokePath()}
 wave(ctx,72,54,0.8,blue);text("Wave",122,30,250,55,34,.bold)
 text("EDITED WALKTHROUGH  /  REAL APP CAPTURES",680,39,1140,32,16,.medium,muted,.right)
 text("SEPOLIA TESTNET  ·  MOCK ASSETS  ·  UNAUDITED",72,1008,1300,30,15,.medium,muted)
 text(String(format:"%02d / %02d",idx+1,9),1700,1008,148,30,16,.medium,muted,.right)
 ctx.setFillColor(color(0x1f2d48).cgColor);ctx.fill(rect(72,1054,1776,3));ctx.setFillColor(blue.cgColor);ctx.fill(rect(72,1054,1776*CGFloat(global/duration),3))
 let enter=CGFloat(min(1,local/0.55));ctx.saveGState();ctx.setAlpha(enter)
 if idx == 0 {
  wave(ctx,884,258,2.6,blue)
  text("Wave Protocol",180,380,1560,148,112,.bold,paper,.center)
  text("Token baskets, in balance.",200,536,1520,80,47,.medium,color(0xb8c9ed),.center)
  text("Uniswap Foundation   /   Chainlink   /   Ethereum Foundation · Anon-RPC",160,702,1600,60,25,.regular,muted,.center)
  text("A product walkthrough. Live-flow gaps stay disclosed.",250,805,1420,55,22,.regular,muted,.center)
 } else if idx == 8 {
  text(scene.kicker,120,215,1680,45,20,.semibold,blue,.center)
  text(scene.title,180,304,1560,230,88,.bold,paper,.center)
  text(scene.bullets.joined(separator:"    /    "),170,607,1580,60,29,.medium,color(0xc4d5fa),.center)
  text(scene.partner,200,730,1520,55,31,.medium,blue,.center)
  text("Verified deployment and setup receipts. Remaining live flows are pending.",180,828,1560,50,22,.regular,muted,.center)
 } else {
  text(scene.kicker,72,185,450,55,17,.semibold,blue)
  text(scene.title,72,260,455,310,58,.bold)
  var yy:CGFloat=615
  for bullet in scene.bullets {round(ctx,rect(74,yy+8,5,5),2,blue);text(bullet,94,yy,425,65,21,.regular,color(0xb5c7e6));yy += 76}
  if !images.isEmpty {
   let p=local/scene.duration;let variant = idx == 6 ? local/9 : p*Double(images.count);let selected=min(images.count-1,Int(variant));let fractional=variant-Double(selected)
   round(ctx,rect(555,184,1303,751),22,color(0x1d2b47))
   if selected>0 && fractional < 0.055 {drawImage(ctx,images[selected-1],p,1);drawImage(ctx,images[selected],p,CGFloat(fractional/0.055))} else {drawImage(ctx,images[selected],p,1)}
  } else {
   round(ctx,rect(565,194,1283,731),18,color(0x111e37))
   text("42",630,250,500,150,110,.bold)
   text("DEPLOYMENT TRANSACTIONS",635,402,900,45,23,.semibold,color(0xa9c2ee))
   text("2",630,492,500,130,94,.bold)
   text("OWNER SETUP TRANSACTIONS",635,622,900,40,23,.semibold,color(0xa9c2ee))
   text("Approval + mock-token faucet",635,680,1080,50,29,.medium)
   text("Deposit / directional swaps / withdrawals / CRE: PENDING",635,790,1130,75,25,.medium,color(0xf4c57e))
  }
  text(scene.partner,565,139,1260,40,19,.semibold,color(0xbdcef0))
 }
 ctx.restoreGState()
 // On-screen captions are the narration, timed within each authored chapter.
 if local >= 0.55 && local < audioDuration+0.55 {
  let cues=splitCues(scene.narration);let progress=(local-0.55)/max(0.1,audioDuration)
  let weights=cues.map{Double($0.split(separator:" ").count)};let total=weights.reduce(0,+);let target=progress*total;var running=0.0;var cue=cues.last!
  for (index, weight) in weights.enumerated() {running+=weight;if target<running {cue=cues[index];break}}
  round(ctx,rect(200,912,1520,82),12,color(0x050914,0.94));text(cue,224,920,1472,70,26,.medium,paper,.center)
 }
 if idx>0 && idx<8 {text(scene.status,565,169,1280,24,15,.medium,color(0xf4c57e),.left)}
 NSGraphicsContext.restoreGraphicsState()
}
func finish(_ writer: AVAssetWriter) async {await withCheckedContinuation{continuation in writer.finishWriting{continuation.resume()}}}
func export(_ asset: AVAsset,_ url:URL,_ preset:String,_ type:AVFileType) async throws {
 if FileManager.default.fileExists(atPath:url.path) {try FileManager.default.removeItem(at:url)}
 guard let session=AVAssetExportSession(asset:asset,presetName:preset) else {throw Failure(message:"Cannot create native media export")}
 session.shouldOptimizeForNetworkUse=true;try await session.export(to:url,as:type)
}
@main struct Main {
 static func main() async throws {
  let args=CommandLine.arguments;try require(args.count>=2,"Usage: render PLAN.json [--inspect-audio]")
  let planURL=URL(fileURLWithPath:args[1]);var plan=try JSONDecoder().decode(Plan.self,from:Data(contentsOf:planURL));let dir=URL(fileURLWithPath:plan.output).deletingLastPathComponent()
  var audioLengths=[Double]()
  for scene in plan.scenes {let a=AVURLAsset(url:URL(fileURLWithPath:scene.audio));audioLengths.append(try await a.load(.duration).seconds)}
  let minimums=audioLengths.map{ceil($0+1)}
  try require(minimums.reduce(0,+)<=plan.duration,"Narration cannot fit three minutes; revise honestly, never truncate")
  for i in plan.scenes.indices {plan.scenes[i].duration=max(plan.scenes[i].duration,minimums[i])}
  var extra=plan.scenes.map(\.duration).reduce(0,+)-plan.duration
  for i in plan.scenes.indices.reversed() {let spare=max(0,plan.scenes[i].duration-minimums[i]);let take=min(spare,extra);plan.scenes[i].duration-=take;extra-=take}
  try require(abs(plan.scenes.map(\.duration).reduce(0,+)-180)<0.01,"Invalid exact duration")
  let encoder=JSONEncoder();encoder.outputFormatting=[.prettyPrinted,.sortedKeys];try encoder.encode(plan).write(to:dir.appendingPathComponent("rendered-plan.json"))
  print("Narration seconds:",audioLengths,"Chapter seconds:",plan.scenes.map(\.duration));fflush(stdout)
  if args.contains("--inspect-audio") {return}
  let allImages=try plan.scenes.map{scene in try scene.images.map(imageAt)}
  let silent=dir.appendingPathComponent("silent-video.mp4");if FileManager.default.fileExists(atPath:silent.path){try FileManager.default.removeItem(at:silent)}
  let writer=try AVAssetWriter(outputURL:silent,fileType:.mp4)
  let settings:[String:Any]=[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:1920,AVVideoHeightKey:1080,AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:3_000_000,AVVideoExpectedSourceFrameRateKey:24,AVVideoMaxKeyFrameIntervalKey:48,AVVideoProfileLevelKey:AVVideoProfileLevelH264HighAutoLevel]]
  let input=AVAssetWriterInput(mediaType:.video,outputSettings:settings);input.expectsMediaDataInRealTime=false
  let attrs:[String:Any]=[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA,kCVPixelBufferWidthKey as String:1920,kCVPixelBufferHeightKey as String:1080,kCVPixelBufferCGImageCompatibilityKey as String:true,kCVPixelBufferCGBitmapContextCompatibilityKey as String:true,kCVPixelBufferIOSurfacePropertiesKey as String:[:]]
  let adaptor=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:attrs);try require(writer.canAdd(input),"Cannot add video input");writer.add(input);try require(writer.startWriting(),"Cannot start writer");writer.startSession(atSourceTime:.zero)
  guard let pool=adaptor.pixelBufferPool else {throw Failure(message:"No native pixel buffer pool")}
  var sceneIndex=0,sceneStart=0.0
  for frame in 0..<Int(plan.duration*Double(plan.fps)) {
   let time=Double(frame)/Double(plan.fps)
   while sceneIndex<plan.scenes.count-1 && time>=sceneStart+plan.scenes[sceneIndex].duration {sceneStart+=plan.scenes[sceneIndex].duration;sceneIndex+=1;print("Rendering chapter \(sceneIndex+1)/9");fflush(stdout)}
   while !input.isReadyForMoreMediaData {if writer.status == .failed {throw writer.error ?? Failure(message:"Video encoder failed")};try await Task.sleep(for:.milliseconds(2))}
   try autoreleasepool {
    var optional:CVPixelBuffer?;let status=CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault,pool,&optional);try require(status==kCVReturnSuccess,"Cannot allocate video frame")
    guard let buffer=optional else {throw Failure(message:"Missing video frame")};CVPixelBufferLockBaseAddress(buffer,[]);defer{CVPixelBufferUnlockBaseAddress(buffer,[])}
    guard let ctx=CGContext(data:CVPixelBufferGetBaseAddress(buffer),width:1920,height:1080,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(buffer),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGBitmapInfo.byteOrder32Little.rawValue|CGImageAlphaInfo.premultipliedFirst.rawValue) else {throw Failure(message:"Cannot draw native frame")}
    drawFrame(ctx,plan.scenes[sceneIndex],sceneIndex,time-sceneStart,time,plan.duration,audioLengths[sceneIndex],allImages[sceneIndex])
    try require(adaptor.append(buffer,withPresentationTime:CMTime(value:Int64(frame),timescale:Int32(plan.fps))),"Video frame rejected")
   }
  }
  input.markAsFinished();await finish(writer);try require(writer.status == .completed,"Silent video incomplete")
  print("Encoding narration mix");fflush(stdout)
  let audio=AVMutableComposition();let voice=audio.addMutableTrack(withMediaType:.audio,preferredTrackID:kCMPersistentTrackID_Invalid)!
  var position=0.0
  for (i,scene) in plan.scenes.enumerated() {let a=AVURLAsset(url:URL(fileURLWithPath:scene.audio));let tracks=try await a.loadTracks(withMediaType:.audio);try require(!tracks.isEmpty,"Missing synthesized narration track");try voice.insertTimeRange(CMTimeRange(start:.zero,duration:CMTime(seconds:audioLengths[i],preferredTimescale:600)),of:tracks[0],at:CMTime(seconds:position+0.55,preferredTimescale:600));position+=scene.duration}
  let ambienceURL=dir.appendingPathComponent("original-ambience.wav")
  if FileManager.default.fileExists(atPath:ambienceURL.path) {let a=AVURLAsset(url:ambienceURL);let tracks=try await a.loadTracks(withMediaType:.audio);let track=audio.addMutableTrack(withMediaType:.audio,preferredTrackID:kCMPersistentTrackID_Invalid)!;try track.insertTimeRange(CMTimeRange(start:.zero,duration:CMTime(seconds:180,preferredTimescale:600)),of:tracks[0],at:.zero)}
  let m4a=dir.appendingPathComponent("narration.m4a");try await export(audio,m4a,AVAssetExportPresetAppleM4A,.m4a)
  let composition=AVMutableComposition(),v=AVURLAsset(url:silent),a=AVURLAsset(url:m4a)
  let vt=try await v.loadTracks(withMediaType:.video),at=try await a.loadTracks(withMediaType:.audio)
  let video=composition.addMutableTrack(withMediaType:.video,preferredTrackID:kCMPersistentTrackID_Invalid)!,sound=composition.addMutableTrack(withMediaType:.audio,preferredTrackID:kCMPersistentTrackID_Invalid)!
  let range=CMTimeRange(start:.zero,duration:CMTime(seconds:180,preferredTimescale:600));try video.insertTimeRange(range,of:vt[0],at:.zero);try sound.insertTimeRange(range,of:at[0],at:.zero)
  try await export(composition,URL(fileURLWithPath:plan.output),AVAssetExportPresetPassthrough,.mp4)
  let final=AVURLAsset(url:URL(fileURLWithPath:plan.output));let length=try await final.load(.duration).seconds;let videos=try await final.loadTracks(withMediaType:.video);let audios=try await final.loadTracks(withMediaType:.audio);let size=try await videos[0].load(.naturalSize)
  let report:[String:Any]=["output":plan.output,"durationSeconds":length,"width":size.width,"height":size.height,"videoTracks":videos.count,"audioTracks":audios.count,"narrationSeconds":audioLengths,"chapterSeconds":plan.scenes.map(\.duration),"scope":"Edited product walkthrough with real app captures. Not an uninterrupted live recording or transaction proof."]
  let data=try JSONSerialization.data(withJSONObject:report,options:[.prettyPrinted,.sortedKeys]);try data.write(to:dir.appendingPathComponent("media-report.json"));print(String(data:data,encoding:.utf8)!);fflush(stdout)
  let generator=AVAssetImageGenerator(asset:final);generator.appliesPreferredTrackTransform=true;generator.requestedTimeToleranceBefore = .zero;generator.requestedTimeToleranceAfter = .zero
  for second in [3,16,36,58,80,104,124,150,172] {let image=try await generator.image(at:CMTime(seconds:Double(second),preferredTimescale:600)).image;let url=dir.appendingPathComponent("review-\(second).jpg");let dest=CGImageDestinationCreateWithURL(url as CFURL,"public.jpeg" as CFString,1,nil)!;CGImageDestinationAddImage(dest,image,[kCGImageDestinationLossyCompressionQuality:0.9] as CFDictionary);try require(CGImageDestinationFinalize(dest),"Cannot save review frame")}
 }
}
