import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';

// Pinned native-only fix: Matroska SimpleBlocks omit the final frame's duration.
// BlockGroups carry BlockDuration and preserve a partial last video frame.
// Never modify node_modules or the existing editor's encoder bundle.
export async function buildNativeCodecs(root,dist){
    const dependency=path.join(root,'node_modules/mediabunny'),version=JSON.parse(fs.readFileSync(path.join(dependency,'package.json'),'utf8')).version;
    if(version!=='1.61.0')throw Error('Review the native WebM duration patch before changing Mediabunny version');
    const filename=path.join(dependency,'dist/modules/src/matroska/matroska-muxer.js'),original=fs.readFileSync(filename,'utf8');
    const needle="const needsBlockGroup = !!chunk.additions || trackData.type === 'subtitle';";
    if(original.split(needle).length!==2)throw Error('Native WebM duration patch no longer matches upstream source');
    const source='// Animation Stage native modification: explicit video BlockDuration for variable final frames.\n'+original.replace(needle,"const needsBlockGroup = !!chunk.additions || trackData.type === 'subtitle' || (trackData.type === 'video' && chunk.duration > 0);");
    await build({entryPoints:[path.join(dependency,'dist/modules/src/index.js')],outfile:path.join(dist,'js/vendor/native3d/movie-codecs.js'),bundle:true,minify:true,format:'esm',target:'es2022',platform:'browser',plugins:[{name:'native-webm-frame-duration',setup(builder){builder.onLoad({filter:/[\\/]matroska[\\/]matroska-muxer\.js$/},()=>({contents:source,loader:'js',resolveDir:path.dirname(filename)}));}}]});
    const sourceDirectory=path.join(dist,'js/vendor/native3d/codec-sources');fs.mkdirSync(sourceDirectory,{recursive:true});fs.writeFileSync(path.join(sourceDirectory,'matroska-muxer.js'),source);fs.copyFileSync(path.join(dependency,'src/matroska/matroska-muxer.ts'),path.join(sourceDirectory,'matroska-muxer.ts'));fs.copyFileSync(path.join(dependency,'LICENSE'),path.join(sourceDirectory,'LICENSE'));
    fs.writeFileSync(path.join(dist,'assets/studio3d/ENCODER-NOTICE.txt'),'Native movie encoder: Mediabunny 1.61.0, Mozilla Public License 2.0.\nUpstream source: https://github.com/Vanilagy/mediabunny/tree/v1.61.0\nNative modification: Matroska video BlockGroups include BlockDuration, preserving a partial final frame.\nModified source and license: ../../js/vendor/native3d/codec-sources/\nBuild/reproduction: scripts/build-native-codecs.mjs in the Animation Stage 3D repository.\nThe existing editor continues to use the original upstream bundle.\n');
}
