/**
 * Lightweight index and mutable runtime registry for authored SVG African artwork.
 * Individual identity payloads register themselves through registerBundle().
 * Regenerate with: node scripts/svg-african-authored-artwork.mjs
 */
(function (global) {
    'use strict';

    if (global.SvgAfricanAuthoredArtwork?.registerBundle) return;

    const REQUIRED_ROLES = Object.freeze(["torso","head-neck","right-arm","left-arm","right-leg","left-leg"]);
    const SIDE_REQUIRED_ROLES = Object.freeze(["torso","head-neck","front-arm","back-arm","front-leg","back-leg"]);
    const INDEX = Object.freeze({
    "ada-lecturer-back": {
        "id": "ada-lecturer-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "ada-lecturer-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "b91efecc0277c3d31966180718690023dcfab315eb81bbede0407b320b7a7c62",
        "sourceHash": "0c4ce54493b08f1fd5078c823169b6aa4efcd2d772f1c0de2d1178bfbd5cd9fd",
        "bundleId": "ada-lecturer",
        "bundleFile": "ada-lecturer.js"
    },
    "ada-lecturer-front": {
        "id": "ada-lecturer-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-from-procedural-renderer-v3",
        "artworkVersion": "ada-front-authored-v1.3",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "26b19ab50f2f266e7896607c131328a5e70a9cb22e1b14daf116dc8ff20453c0",
        "sourceHash": "639d508efbc5d0e42af5e1772e948e60407193295359d9129ff4367843ca64d2",
        "bundleId": "ada-lecturer",
        "bundleFile": "ada-lecturer.js"
    },
    "ada-lecturer-side-left": {
        "id": "ada-lecturer-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "ada-lecturer-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "589a4f63003a4a93a0e3468880f7ee6b805e5e9502b3bd6f7e4a05a889c42a29",
        "sourceHash": "b3ca9596b504d7b6d2858f3401e933285d89667e786274473f41bcb7f0c49ea8",
        "bundleId": "ada-lecturer",
        "bundleFile": "ada-lecturer.js"
    },
    "ada-lecturer-side-right": {
        "id": "ada-lecturer-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "ada-lecturer-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "709d30786a91a206405550a101cadfe20035ab0ae4f4935b291b440dc314f211",
        "sourceHash": "637252705892c9cbe04905925264b5ff3954f4af970451a48ad1c24a3db3029b",
        "bundleId": "ada-lecturer",
        "bundleFile": "ada-lecturer.js"
    },
    "agbada-formal-premium-back": {
        "id": "agbada-formal-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "agbada-formal-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "1b40bad017f3104b9b7be59b3a0e41436f5b57b1f3a302913dbc2670e598314a",
        "sourceHash": "a9817594967479de06a897361e768cb9d930d96d704cf44ac60e57bfbcaab5d8",
        "bundleId": "agbada-formal",
        "bundleFile": "agbada-formal.js"
    },
    "agbada-formal-premium-front": {
        "id": "agbada-formal-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "curated-six-part-cultural-silhouette-refinement-v2",
        "artworkVersion": "agbada-formal-premium-front-authored-v1.2",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "be5880514607c1d3c90f740dc0aa9d839ccfab2d173131db56078ae9b0a233d2",
        "sourceHash": "9f00a4a551026e8fdf35c718dcdf7d93ec472a53eac2c8a0e5b5a5abca3fc89e",
        "bundleId": "agbada-formal",
        "bundleFile": "agbada-formal.js"
    },
    "agbada-formal-premium-side-left": {
        "id": "agbada-formal-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "agbada-formal-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "0ac8a2a8ef497e00a0eeeb9c0c97e2430030fc0ef9efca76c9de4221652a07f3",
        "sourceHash": "8288c33e7a0e6c2c15461ca5534179068f26cd78f6d3eb5da168f70ceb75d8be",
        "bundleId": "agbada-formal",
        "bundleFile": "agbada-formal.js"
    },
    "agbada-formal-premium-side-right": {
        "id": "agbada-formal-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "agbada-formal-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "c5d95475694dcd79e918124ae569c9c6267946d645e484c2ea3302c58a0da07a",
        "sourceHash": "041fee3ddb8bb10ee8c91a71ba2993333b0a985c5a3a9f182ab804c0ea4201ba",
        "bundleId": "agbada-formal",
        "bundleFile": "agbada-formal.js"
    },
    "ankara-creative-premium-back": {
        "id": "ankara-creative-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "ankara-creative-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "ceb64764e4fdcf08b0efcaacab06c03af883a200f88cfbfb3373f0cf6bed61af",
        "sourceHash": "6b2bc07b8c8fb7cbe97187f7bee2acbcb1ca069b6354a29a394952cfc379c46d",
        "bundleId": "ankara-creative",
        "bundleFile": "ankara-creative.js"
    },
    "ankara-creative-premium-front": {
        "id": "ankara-creative-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "curated-six-part-cultural-silhouette-refinement-v2",
        "artworkVersion": "ankara-creative-premium-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "51d7f47b2f017a8d2b7fed9c82acafee96edff49948271c480afeb126dc584b5",
        "sourceHash": "3d807a414e917d83f5f884546a89d3f7c70a70540c4accae00bc9841bd7f568b",
        "bundleId": "ankara-creative",
        "bundleFile": "ankara-creative.js"
    },
    "ankara-creative-premium-side-left": {
        "id": "ankara-creative-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "ankara-creative-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "adf0f64124949f2e064cd19e3bb19ebae21a65b1634ebd8501412b6e6ea540ef",
        "sourceHash": "38f3e361ebe6d1a1219f50974b66a39180a83c5d6ddd8d80c452fa6fbad5bbab",
        "bundleId": "ankara-creative",
        "bundleFile": "ankara-creative.js"
    },
    "ankara-creative-premium-side-right": {
        "id": "ankara-creative-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "ankara-creative-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "179a773129ed551db383bc61f8c59b6f66307db395d1075c4bcd69eb931b63b6",
        "sourceHash": "8094f167159d6bf73325d82eee0bb01b8c0e07535396afce44ea2c04a8ce0357",
        "bundleId": "ankara-creative",
        "bundleFile": "ankara-creative.js"
    },
    "business-executive-premium-back": {
        "id": "business-executive-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "business-executive-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "3ec8a1598318dca0de5a1dbf5c36e10b64d50c88ffa65a5b77b86036fe595152",
        "sourceHash": "2df3c7005f4ae3f86724dd755b588a0f18de1329e383119cdb57ac0a42050887",
        "bundleId": "business-executive",
        "bundleFile": "business-executive.js"
    },
    "business-executive-premium-front": {
        "id": "business-executive-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "business-executive-premium-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "03469af5a0e3577ef9f1d6a9be59b64a58112ff27572899a1207b48c6cc4ab6f",
        "sourceHash": "f08a39d6630797af68e4cf83fc76ba297ffafdeba8043cd05658a9432424f663",
        "bundleId": "business-executive",
        "bundleFile": "business-executive.js"
    },
    "business-executive-premium-side-left": {
        "id": "business-executive-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "business-executive-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "d5c1218c1b97dfd515dee7f23b220a20b23b15ec35461842ee0b52b6325f3b29",
        "sourceHash": "2b65061437f236bb67ac13bab97f98ff8109b2b5008506937e1c38a7b43595c9",
        "bundleId": "business-executive",
        "bundleFile": "business-executive.js"
    },
    "business-executive-premium-side-right": {
        "id": "business-executive-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "business-executive-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "39b40b67843bc937368748c8f38b8531228244b7efe1417e1231f4782a1feb8d",
        "sourceHash": "cb464dd71c157675cc24abc4806a0463f86770fe5525ad7f68bf36e6c263f508",
        "bundleId": "business-executive",
        "bundleFile": "business-executive.js"
    },
    "chef-premium-back": {
        "id": "chef-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "chef-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "03efa64c0e02f75b349242e75b80083750e9a6b6fb1de9ed7c869dce2f4a6232",
        "sourceHash": "475488749ad19c161eedd934627e14d7dcefd6324a2ea704a3d16d307b03c19a",
        "bundleId": "chef",
        "bundleFile": "chef.js"
    },
    "chef-premium-front": {
        "id": "chef-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "chef-premium-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "c32a49ed8b0bc1e14ab4b5c8b20957df00e98a54631aa01d6c8954141a1505d6",
        "sourceHash": "14c70d66850b5bed752ad6a6c781d85df02cbe4f106e72e624246a9e97cf72b4",
        "bundleId": "chef",
        "bundleFile": "chef.js"
    },
    "chef-premium-side-left": {
        "id": "chef-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "chef-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "4135aabdef108e4477bbb747c1946561895d9aa12ad79f3d0b2a8bd8e5777512",
        "sourceHash": "53c930c0d21611f35783321d1cbc6ad31e21c49561fe001eefed80e0ceed7a56",
        "bundleId": "chef",
        "bundleFile": "chef.js"
    },
    "chef-premium-side-right": {
        "id": "chef-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "chef-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "115d69fd21fcb01c83f076931447ea8dde13673cfe9f20cf95c9f340974a1cdc",
        "sourceHash": "ab7b1e3576f6783802dd839c52f997c9137eeb6a3f43fef64ce2b98304cfe67f",
        "bundleId": "chef",
        "bundleFile": "chef.js"
    },
    "corporate-woman-premium-back": {
        "id": "corporate-woman-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "corporate-woman-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "86814c11694fefc952666b4cb165989cf6dd95a1237f3cb3386be0816b3b71d9",
        "sourceHash": "dcf4f188f484a74494389b3d89193b4601a0217d6e7f0afb290c267c0f1be33e",
        "bundleId": "corporate-woman",
        "bundleFile": "corporate-woman.js"
    },
    "corporate-woman-premium-front": {
        "id": "corporate-woman-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "corporate-woman-premium-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "99eeefa59f66e90ea40149b9ef41cc958e6b9c4ce01eeaf6e4f93003c23bfb98",
        "sourceHash": "837a80747bf8fb5993a57f7f1d4fa7ebb8c6e8d38bc40152da188a547381f640",
        "bundleId": "corporate-woman",
        "bundleFile": "corporate-woman.js"
    },
    "corporate-woman-premium-side-left": {
        "id": "corporate-woman-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "corporate-woman-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "903a0085158b1b3f903d602519a2aae00cf3fae231433f73e2cb93236fe02b83",
        "sourceHash": "1404da69e1ed32e9436571d51834c0bbd53a97b2cf73ce2c54317dd0218f9c32",
        "bundleId": "corporate-woman",
        "bundleFile": "corporate-woman.js"
    },
    "corporate-woman-premium-side-right": {
        "id": "corporate-woman-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "corporate-woman-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "c2bf13af49dee1f54a852393d8e1079d34aa7a5e610f76b35f0aef22b8f9453a",
        "sourceHash": "f6b8e6c57ef64d411b2767c0b2f7b60eb9f3e991de043614e72c9c442e97a670",
        "bundleId": "corporate-woman",
        "bundleFile": "corporate-woman.js"
    },
    "engineer-field-premium-back": {
        "id": "engineer-field-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "engineer-field-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "645fff6ff5b76eb35190ed7debef35206a638e9f8281bc524653503606038056",
        "sourceHash": "5c2941d4512a6ea2cf3012286c41c2d26aa31b57b34557e594bc1ae1c309111f",
        "bundleId": "engineer-field",
        "bundleFile": "engineer-field.js"
    },
    "engineer-field-premium-front": {
        "id": "engineer-field-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "engineer-field-premium-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "1fb877c6665fc050e5475c107e6673847e48892c19d9b660c02fefb1bb29c08d",
        "sourceHash": "0985e7540849e0a2d8d7e37e12e7c7a3e784674925cf96d52f56f93d8324c886",
        "bundleId": "engineer-field",
        "bundleFile": "engineer-field.js"
    },
    "engineer-field-premium-side-left": {
        "id": "engineer-field-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "engineer-field-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "de322852becd4f498ea8933982b2a09281015d88f094b1d5c137de6fcfb3aaa1",
        "sourceHash": "95d4af9b33d59add24925d380707b356ee3224482b1cea4cef6a3cca7cfceae0",
        "bundleId": "engineer-field",
        "bundleFile": "engineer-field.js"
    },
    "engineer-field-premium-side-right": {
        "id": "engineer-field-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "engineer-field-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "978b696330327e2d296997dbb8b5b1d60b29ce11ed1a3863e76be21d8c4ab4d0",
        "sourceHash": "3d79879c4f442bebfa95a5947113973e1adb6f2922094ad9e97a35e1de5b247a",
        "bundleId": "engineer-field",
        "bundleFile": "engineer-field.js"
    },
    "event-host-premium-back": {
        "id": "event-host-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "event-host-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "6823b62843a20d954a6fb18441e30e3099e4d9c3fa1d0de3f211605b86509e74",
        "sourceHash": "4e29540d0593c9c80fc7e4c9e6d2492d8fbb2e3e49a0abcd024d554abc8b170e",
        "bundleId": "event-host",
        "bundleFile": "event-host.js"
    },
    "event-host-premium-front": {
        "id": "event-host-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "event-host-premium-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "c4a904fd27a9362a3a503b387715cbbe459aa161189f4ae33fde90c76c3e036c",
        "sourceHash": "6fa7148df1f8494f1dcf1134e5158045295b79093b985cb47089516fb1e41ff4",
        "bundleId": "event-host",
        "bundleFile": "event-host.js"
    },
    "event-host-premium-side-left": {
        "id": "event-host-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "event-host-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "a7517e27ddf9a0ea0c9b8091e9c4ebd448c5c5c1c55eaef694bde44a1646fab2",
        "sourceHash": "aadaac8c5477ea9171828f6f658cf75e6fcc92216b0e8fa3d2b60cb97a389fd3",
        "bundleId": "event-host",
        "bundleFile": "event-host.js"
    },
    "event-host-premium-side-right": {
        "id": "event-host-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "event-host-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "55f4939b761c5fef81cf377386d1d6749acb9169eef3c8a698eb828f592b0197",
        "sourceHash": "9f00e750d2459b04ecfbb01970c20b235e56b1870d8ed896f39455d51bac9724",
        "bundleId": "event-host",
        "bundleFile": "event-host.js"
    },
    "female-academic-gown-premium-back": {
        "id": "female-academic-gown-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "female-academic-gown-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "e1f5d3c7b3c99e38e6a32ab9432db2a54bb7209aca1d0cb548ff19dcd0374563",
        "sourceHash": "35153241c136953600dd6332646aac58446cd2d2fd055ba28d63ab9c5de7b8ce",
        "bundleId": "female-academic-gown",
        "bundleFile": "female-academic-gown.js"
    },
    "female-academic-gown-premium-front": {
        "id": "female-academic-gown-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "female-academic-gown-premium-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "d43f09149153abb8d987b0a380b0ef0b002a5d3feaf136144d6673b393de68cd",
        "sourceHash": "c7df0861c42a610b3a74fa50b39ec0b06575dd2845e8ac5f54fa81a5717549fc",
        "bundleId": "female-academic-gown",
        "bundleFile": "female-academic-gown.js"
    },
    "female-academic-gown-premium-side-left": {
        "id": "female-academic-gown-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "female-academic-gown-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "c7174ec5de6d7af54dab4b52926aeec7cf4729b3b73fabf602c0371a9352ea3f",
        "sourceHash": "ef69d79287b0ed5985212d947d97d00c44e6c1ee2318db8ae347f75113e67a4c",
        "bundleId": "female-academic-gown",
        "bundleFile": "female-academic-gown.js"
    },
    "female-academic-gown-premium-side-right": {
        "id": "female-academic-gown-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "female-academic-gown-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "59dd86593ecbc47e0640561221e97dca5e23cc88f08e0fac4d28574574ae85fc",
        "sourceHash": "e0347056be811aaee94ebf40d6d55929d73c1478324b6fea16a33750973746af",
        "bundleId": "female-academic-gown",
        "bundleFile": "female-academic-gown.js"
    },
    "female-doctor-back": {
        "id": "female-doctor-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "female-doctor-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "526772bb5787b9af02976f9f2bff3824048721da4f7fed63acc516c74ca37c6d",
        "sourceHash": "dd24da71693b5e63527f855efa1d55520c6772a3a2701092806b7e5d4ba7d467",
        "bundleId": "female-doctor",
        "bundleFile": "female-doctor.js"
    },
    "female-doctor-front": {
        "id": "female-doctor-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "female-doctor-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "ce2f5472eb439ab29652b950bc2adfd70b2f74e4498c1bcae6dd4d86e895c1bc",
        "sourceHash": "1d4d3e40bcc01daf57c909f0f5f7e583e6635047737871a45bd28b52c51cbb9f",
        "bundleId": "female-doctor",
        "bundleFile": "female-doctor.js"
    },
    "female-doctor-side-left": {
        "id": "female-doctor-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "female-doctor-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "80d4af2fc473d85259a574d3024a629d6e0edfac51110592395a6cb00c943ace",
        "sourceHash": "659b279160378b562808f107f3c4a003341fd4c407674d1b3d516856b8a25cda",
        "bundleId": "female-doctor",
        "bundleFile": "female-doctor.js"
    },
    "female-doctor-side-right": {
        "id": "female-doctor-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "female-doctor-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "1c71c80146f9ade54b85f4b1379d19fbb56d6e97298c1d3c0631d360c8140a0a",
        "sourceHash": "8afbc2763137b2f2a8821fbfa716cf540e45bf1afc62df55de6f8949cbfc659f",
        "bundleId": "female-doctor",
        "bundleFile": "female-doctor.js"
    },
    "female-student-back": {
        "id": "female-student-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "female-student-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "52a960e8272f527917b01ab6ac7b19eca9505485a4e9626ddf160e38cdc3fa72",
        "sourceHash": "651506a6253ac98c16426459d08b5db4da4a3c7aff83b2f9f46c25318b7f0fa8",
        "bundleId": "female-student",
        "bundleFile": "female-student.js"
    },
    "female-student-front": {
        "id": "female-student-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "female-student-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "11d6637925bb23402df471dd6e9a634b7b33ad4caaebe9955ad7d9bb92d8b3e0",
        "sourceHash": "d8a59e8bea502c3cfe91eb2caefad9eef1bcec9f91ebab6da9baca02df874ad6",
        "bundleId": "female-student",
        "bundleFile": "female-student.js"
    },
    "female-student-side-left": {
        "id": "female-student-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "female-student-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "24039d3e34538e10bdbd4de04632ccc29cd55d9d11be53e31bf6cb6a158b4b8b",
        "sourceHash": "e51bdeba19d2d831f243e5ff73d30e9a65b4ab6abbb8c6c62e703cf5d37fa346",
        "bundleId": "female-student",
        "bundleFile": "female-student.js"
    },
    "female-student-side-right": {
        "id": "female-student-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "female-student-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "60ebb49faedcd409a8f236d2c610570e73add56cacab35c32d8957486c74e2c0",
        "sourceHash": "72b4feff2b18cafa4b78e076c81abbfccf40848352d3f462599532a90939de05",
        "bundleId": "female-student",
        "bundleFile": "female-student.js"
    },
    "football-athlete-premium-back": {
        "id": "football-athlete-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "football-athlete-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "a878660ed5230a704f0f1e608727ea5e331213ccbb86cca97feb1c24b4f93dd3",
        "sourceHash": "48e15657db433c371dda04b7505ebd25db3b417cf149ebf5a6d714be4068390c",
        "bundleId": "football-athlete",
        "bundleFile": "football-athlete.js"
    },
    "football-athlete-premium-front": {
        "id": "football-athlete-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "football-athlete-premium-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "dd4def4ddd1a5d5c4d3b92f3a4de16c8da95bdbf69a35a2b6df4bcfabdd78cdf",
        "sourceHash": "9ff300f57726ab23ca27ff4a35ac2ffe28a30a6b92f10caeb3168e55fab4f2a1",
        "bundleId": "football-athlete",
        "bundleFile": "football-athlete.js"
    },
    "football-athlete-premium-side-left": {
        "id": "football-athlete-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "football-athlete-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "8cb4858193b55178c0167e4601a87911808cc74634ad17ef3c713ab7010c984c",
        "sourceHash": "50dffb2f46c34e337a4ca42cfe4208cef270eabc350a7586091fa53767733c5c",
        "bundleId": "football-athlete",
        "bundleFile": "football-athlete.js"
    },
    "football-athlete-premium-side-right": {
        "id": "football-athlete-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "football-athlete-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "3d60d8e747b3b9a26303c6dde2a36b97f0917e92f3b1e844a7e1f3e98c4215f2",
        "sourceHash": "747bf8a1c2ee6e747ac6613287a1d642f16fa26a49a435bf8a2f84252513e530",
        "bundleId": "football-athlete",
        "bundleFile": "football-athlete.js"
    },
    "george-wrapper-premium-back": {
        "id": "george-wrapper-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "george-wrapper-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "5f38872c5ca8ecb51bee26a33c0592ac04dd754fef1a6d39cfcf308e439dc997",
        "sourceHash": "d4a05ec2ead326edb2142023e9addb75873963cffcca8c775b738f384ef1ee73",
        "bundleId": "george-wrapper",
        "bundleFile": "george-wrapper.js"
    },
    "george-wrapper-premium-front": {
        "id": "george-wrapper-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "curated-six-part-cultural-silhouette-refinement-v2",
        "artworkVersion": "george-wrapper-premium-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "8da2dfc2b81d2253c8891a5af50c180b701d6185d13f4d4ed20411d6db974cc0",
        "sourceHash": "d77e3c0f7e6421c44b5d171d6efaee25c2f8ca98768afcb1c6e85fd6aaf3138b",
        "bundleId": "george-wrapper",
        "bundleFile": "george-wrapper.js"
    },
    "george-wrapper-premium-side-left": {
        "id": "george-wrapper-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "george-wrapper-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "d77f1c92b8306164c37c513355ea1b402e3e442a4ffe5acca20c173bf978f0f8",
        "sourceHash": "ba98123bf3074821fd7f80a8ce1270b847f33d5b15f12ba2601f1d63dd1dd39c",
        "bundleId": "george-wrapper",
        "bundleFile": "george-wrapper.js"
    },
    "george-wrapper-premium-side-right": {
        "id": "george-wrapper-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "george-wrapper-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "8fca4f57bd0b692e9f2cb12734f903f393e2df7bed07d3d7c5de867255ee02b0",
        "sourceHash": "334a4e6da36444a0def65510a7dde547da097288da79713ef76e81ab837dc429",
        "bundleId": "george-wrapper",
        "bundleFile": "george-wrapper.js"
    },
    "iro-buba-premium-back": {
        "id": "iro-buba-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "iro-buba-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "e2fb738a4fe343c999b9e98a75d31ddfdf4598bf1be6e74136a2fa0dd9f454df",
        "sourceHash": "85afa84577a00477acae70356f98d16c6589af43ece5b8f58e34d7939f31584a",
        "bundleId": "iro-buba-woman",
        "bundleFile": "iro-buba-woman.js"
    },
    "iro-buba-premium-front": {
        "id": "iro-buba-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "curated-six-part-cultural-silhouette-refinement-v2",
        "artworkVersion": "iro-buba-premium-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "86959d4eebdac9dea06b8f9701e2c1d8a105468a69926ce39fe3e65e52e49119",
        "sourceHash": "749861b5e82524d618fcad041b140a3f166d7ba1550c39e8559344e3fab6c90d",
        "bundleId": "iro-buba-woman",
        "bundleFile": "iro-buba-woman.js"
    },
    "iro-buba-premium-side-left": {
        "id": "iro-buba-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "iro-buba-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "154079797c197f5a322a2cbb24010aee31d4454fd7faeff571aac13058d37b9c",
        "sourceHash": "40d5385e98641b7395a1b3c189425de8942aef28eed337aadc8ec33a0ab3db8f",
        "bundleId": "iro-buba-woman",
        "bundleFile": "iro-buba-woman.js"
    },
    "iro-buba-premium-side-right": {
        "id": "iro-buba-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "iro-buba-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "e5e746f095838a384bb7488cdf4789a37960934dc9b97c4bb6b76b026e9cb26b",
        "sourceHash": "e660ba407a3fa144bc425ad00c170f33463eeb9f79120e0f983be4dfaad94900",
        "bundleId": "iro-buba-woman",
        "bundleFile": "iro-buba-woman.js"
    },
    "lab-scientist-premium-back": {
        "id": "lab-scientist-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "lab-scientist-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "8a18a5a7f911fec9641fa4e157897a5598291297a942a78b45c9df424434091d",
        "sourceHash": "61fbeecb7f3d42701dc048a0799c903c321fea13599fb5dc56d0042a8788a88c",
        "bundleId": "lab-scientist",
        "bundleFile": "lab-scientist.js"
    },
    "lab-scientist-premium-front": {
        "id": "lab-scientist-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "lab-scientist-premium-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "bc2f0d00ad0640d0694f54897c7e424c28a1f3e56b6e2de9c5b350ec36715d2b",
        "sourceHash": "276d5a02a007e35702cd17ccfbd8605937d180b2b2b82c737fc40cfcdaa84d38",
        "bundleId": "lab-scientist",
        "bundleFile": "lab-scientist.js"
    },
    "lab-scientist-premium-side-left": {
        "id": "lab-scientist-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "lab-scientist-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "b3ba502c1da2415355eda1cf4b5343e9353caa6e9af4c6b7376365bf4cfce334",
        "sourceHash": "56174ef434b2eb91302e7d831a5cc2323ac04f68abb2fdfab6cd9712eb789b92",
        "bundleId": "lab-scientist",
        "bundleFile": "lab-scientist.js"
    },
    "lab-scientist-premium-side-right": {
        "id": "lab-scientist-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "lab-scientist-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "04a482e07e9b1849a761af7a7bf4532e11714a619e1bc3f9793ee95fadf8b9ba",
        "sourceHash": "763580fa3b09d6ebd22db1dddae94b034c35500e3afe9d0c155f3c86f7ca9211",
        "bundleId": "lab-scientist",
        "bundleFile": "lab-scientist.js"
    },
    "lawyer-premium-back": {
        "id": "lawyer-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "lawyer-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "23ae4ff97dda90ae2837c13a5531fabdbe8ac77e3c5c55e8aa083461a1339a9d",
        "sourceHash": "8dad20319f2c9e18a760a2eb33d7ca8218aded4c17cc8673506749ba61cfc980",
        "bundleId": "lawyer",
        "bundleFile": "lawyer.js"
    },
    "lawyer-premium-front": {
        "id": "lawyer-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "lawyer-premium-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "7e5d2937cab12abbbec5f6fd47edcfbba2dfec3c2f213a3b7390a8368f47f786",
        "sourceHash": "e879d79c65b274c3fb421c46aaab1c2d094b0884e232591a4bba7eda30d31295",
        "bundleId": "lawyer",
        "bundleFile": "lawyer.js"
    },
    "lawyer-premium-side-left": {
        "id": "lawyer-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "lawyer-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "1a11ec9ab2e257893414309545227d6cc860b201a498330287463c4100111175",
        "sourceHash": "01506174d58ee20fe89ac9cddb52ca11e8a2fef88c8f425c7dc4c08c43928310",
        "bundleId": "lawyer",
        "bundleFile": "lawyer.js"
    },
    "lawyer-premium-side-right": {
        "id": "lawyer-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "lawyer-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "53d2fd5b8218e8293e63f0f91eb873588151ad7eb953b74b629969316fe81035",
        "sourceHash": "9018771acc6f7160b0678fd406254df24ed67c7490b13e8946aba8a0dfb418e0",
        "bundleId": "lawyer",
        "bundleFile": "lawyer.js"
    },
    "male-academic-gown-premium-back": {
        "id": "male-academic-gown-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "male-academic-gown-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "febde3c746c399e3ddb9b9d13b8718c676bbae44aeed52ce2482957db3a56ee2",
        "sourceHash": "6ffe659bf942d2927b7a245a7445415e07190e4e5ebcc08137d82466a6ef7899",
        "bundleId": "male-academic-gown",
        "bundleFile": "male-academic-gown.js"
    },
    "male-academic-gown-premium-front": {
        "id": "male-academic-gown-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "male-academic-gown-premium-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "cecbd8e58f97317d1b96355453bad606ddcb049d054c19b4db18ffe5bd41aaa4",
        "sourceHash": "3beb67dca43e5671a8c45b622b99deb2aed52e7940a094615dd56ffb55730b21",
        "bundleId": "male-academic-gown",
        "bundleFile": "male-academic-gown.js"
    },
    "male-academic-gown-premium-side-left": {
        "id": "male-academic-gown-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "male-academic-gown-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "6ad5de286071f70ecca7ee2f7c861323462f7ef420d87fdd40e74ee4069b54f7",
        "sourceHash": "c084cd6a29cd7a485f3dadfeea9885c60e34be3372f7dc9d415a664b496b95bc",
        "bundleId": "male-academic-gown",
        "bundleFile": "male-academic-gown.js"
    },
    "male-academic-gown-premium-side-right": {
        "id": "male-academic-gown-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "male-academic-gown-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "4d40d4ef30912674a5205975908b3ec4596a4a07cf7ec44b1c851fa173ab53c1",
        "sourceHash": "def4435eccd296f7e9d783bec793ce38611b907e7cccf69aded19ce54c142e28",
        "bundleId": "male-academic-gown",
        "bundleFile": "male-academic-gown.js"
    },
    "male-doctor-back": {
        "id": "male-doctor-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "male-doctor-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "45491471f7a34f91f18710cedfb77ef420b88a2a70b0148ca90aae7df079582d",
        "sourceHash": "1172220c45a90da964cc31b8e75fc5533cce649f321337ad886ba22a79076352",
        "bundleId": "male-doctor",
        "bundleFile": "male-doctor.js"
    },
    "male-doctor-front": {
        "id": "male-doctor-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "male-doctor-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "281090f73b02f20ae6693bbe78bdb809799f16193b580fcd2ca31c237d9c6d55",
        "sourceHash": "84a4ff6cc42caca39d1072a11f9c52c61cedf33e8fa54d85b18896cf1ba7ff1d",
        "bundleId": "male-doctor",
        "bundleFile": "male-doctor.js"
    },
    "male-doctor-side-left": {
        "id": "male-doctor-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "male-doctor-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "3ba48f5fe52d01bee6ff5128b8c25d7cca1b9ec961cc9d4e0fd2f921c537ab0c",
        "sourceHash": "70f4a316d1124a27d79f723db4ac0bf9ec28648338ed71a8522360dbd474c53b",
        "bundleId": "male-doctor",
        "bundleFile": "male-doctor.js"
    },
    "male-doctor-side-right": {
        "id": "male-doctor-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "male-doctor-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "a446888ed037b6a20c64629710e50a1621c4a1c253334841c75590deec5e9995",
        "sourceHash": "958b4192fcb081d48e16f9455a4563bdad75c98acc6bf6e27a30cd6124d926f0",
        "bundleId": "male-doctor",
        "bundleFile": "male-doctor.js"
    },
    "male-lecturer-back": {
        "id": "male-lecturer-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "male-lecturer-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "0aae27db0ebf2bd549275be7cd9a0b0aab6d2f8ae17e6989cd85c49a4961a1e8",
        "sourceHash": "5a62396d8972df478673ed687c2fb2ecce4f6579e7baded142be2bc97738ea31",
        "bundleId": "male-lecturer",
        "bundleFile": "male-lecturer.js"
    },
    "male-lecturer-front": {
        "id": "male-lecturer-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "male-lecturer-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "54485ca4d994a9305c05241db9b59d5cedaed340bfe001b32fc9a65dfd03d5e7",
        "sourceHash": "8255aac54afecf209e82ed1bc9563b6ef201fb07883ef89041c707e42b0c0675",
        "bundleId": "male-lecturer",
        "bundleFile": "male-lecturer.js"
    },
    "male-lecturer-side-left": {
        "id": "male-lecturer-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "male-lecturer-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "9c85469f5586acbb0fa3d08ac6af37bd2b25aab8fca6a2f90bbf44a3f3351050",
        "sourceHash": "b6ce4e070e0bd1353659216c92e25fd1e346d01f4decd6945b78ce964d006a41",
        "bundleId": "male-lecturer",
        "bundleFile": "male-lecturer.js"
    },
    "male-lecturer-side-right": {
        "id": "male-lecturer-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "male-lecturer-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "6db417dd02fc471caed8cb66435739fa2f389984f04bb001f14901090ea4fe19",
        "sourceHash": "ff0ee50ad0ee3157b52f763bc34bd858253202bcc6fa4e941da1fcf52cef446e",
        "bundleId": "male-lecturer",
        "bundleFile": "male-lecturer.js"
    },
    "male-student-back": {
        "id": "male-student-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "male-student-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "f6c5b71e7b232b67ec56206bee6744dc0bf32092aa71c1a60aaca830785ebef4",
        "sourceHash": "da980169bbf4bebfbd8775fb69cb3d92e9e87319971ffb0c025f0ba364cc2a30",
        "bundleId": "male-student",
        "bundleFile": "male-student.js"
    },
    "male-student-front": {
        "id": "male-student-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "male-student-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "b35c61113df704ffbeed6bca3e2997a8366e80e98e674ea01ff125572af752a3",
        "sourceHash": "9156734e8f6f6c4cb9ba4d24290eb5c34c476121c5899f447944e9f5daf56b25",
        "bundleId": "male-student",
        "bundleFile": "male-student.js"
    },
    "male-student-side-left": {
        "id": "male-student-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "male-student-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "2ce5af154fec064c2369c372151f33be660eeb7d5b0d79c67ffca1ca24334b45",
        "sourceHash": "48ba514f6988ecae604c720af55913999f388ea2176c8c730975e7a982770a9a",
        "bundleId": "male-student",
        "bundleFile": "male-student.js"
    },
    "male-student-side-right": {
        "id": "male-student-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "male-student-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "f2082e1ea3b0331ddffabe76888188f4ee6fb8728f3e4022a5ead9f1cafbf02f",
        "sourceHash": "4fe6cdf7c30125e5506a40ef76f5cd1f1363b266ebb3eb3c640bb3b209aebb27",
        "bundleId": "male-student",
        "bundleFile": "male-student.js"
    },
    "media-presenter-premium-back": {
        "id": "media-presenter-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "media-presenter-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "24b61794f41c35264b3e39f9a52c4300955a5452a1854e8f582221f3dd55c531",
        "sourceHash": "74ec64487785224f161c777b2750803488613e143f73f8f213cfc573b2580444",
        "bundleId": "media-presenter",
        "bundleFile": "media-presenter.js"
    },
    "media-presenter-premium-front": {
        "id": "media-presenter-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "media-presenter-premium-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "da0614b4670ccad47c03bfe7e3a694974864b7a7621ccba01629e974f960f2a6",
        "sourceHash": "ef871574f4e6d2f279c6c883f7ea249d387640dd6199ee993ab2c8e1c127b374",
        "bundleId": "media-presenter",
        "bundleFile": "media-presenter.js"
    },
    "media-presenter-premium-side-left": {
        "id": "media-presenter-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "media-presenter-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "3b0dcfe41a09218bab3d038c4aeb111046170af25d082d976c062d6d1d64a223",
        "sourceHash": "9334cf6369cbb5eceee99916188e83468abd5da3d4f6455dfbc8a22004c2e5bc",
        "bundleId": "media-presenter",
        "bundleFile": "media-presenter.js"
    },
    "media-presenter-premium-side-right": {
        "id": "media-presenter-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "media-presenter-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "cec30c5ab817f6dec332b305d84de67da6f52cc7fe709b8e41c0f832ea050872",
        "sourceHash": "dcec8a06c7ce08f01f713e2d165088d78114d3e397e64561c5a34b6b69366d5d",
        "bundleId": "media-presenter",
        "bundleFile": "media-presenter.js"
    },
    "neutral-presenter-premium-back": {
        "id": "neutral-presenter-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "neutral-presenter-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "503fbef73715d06ed77d930140bebc5f194afba35098b7e77d3b6c8b9a881e52",
        "sourceHash": "03bf86d916676ec951fae47ccfd439bff9e168553d023255e1cb9c18549deec8",
        "bundleId": "neutral-presenter",
        "bundleFile": "neutral-presenter.js"
    },
    "neutral-presenter-premium-front": {
        "id": "neutral-presenter-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "neutral-presenter-premium-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "81e6ebd8f87f74407c19e3309ec6a7f22fc769faa9c0397152b45e9cebd785c9",
        "sourceHash": "e05af361456dca61642a3aa2366bf57200eb64b88fdb85960957b83abf128542",
        "bundleId": "neutral-presenter",
        "bundleFile": "neutral-presenter.js"
    },
    "neutral-presenter-premium-side-left": {
        "id": "neutral-presenter-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "neutral-presenter-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "be134e5f62639da77954792192805bf959f456b692fbabb932a3257cb9c27af3",
        "sourceHash": "05e9f0715dbadb321d4657af6dab559f3697f73fdaa5ce933388a71c43740966",
        "bundleId": "neutral-presenter",
        "bundleFile": "neutral-presenter.js"
    },
    "neutral-presenter-premium-side-right": {
        "id": "neutral-presenter-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "neutral-presenter-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "8796bfe7a06937c3f1482620feafb3879981b797066f8eebe4e5f9fee6ea019b",
        "sourceHash": "088b04dbd78f71221596a96320529368564eba5d8c04ab7cd7ed47373671fcc8",
        "bundleId": "neutral-presenter",
        "bundleFile": "neutral-presenter.js"
    },
    "nurse-female-premium-back": {
        "id": "nurse-female-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "nurse-female-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "423f3d64c4348b1fe21da2280a4a269c310fb214c97e25aa04af884ff3b3e6cc",
        "sourceHash": "20fb0c1a940dcdbdd7b4d4cf04aa3d65a05b38073accbd8e53351219f2c3b743",
        "bundleId": "nurse-female",
        "bundleFile": "nurse-female.js"
    },
    "nurse-female-premium-front": {
        "id": "nurse-female-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "nurse-female-premium-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "e4f17cc918d98d78e232231fb538e8f83e4ca7f575ece1933d50cccddcbe6121",
        "sourceHash": "dea026fd98ba3a4e5c9f10ce2bf986785945c0919322829e5c5da5f5ceb80d51",
        "bundleId": "nurse-female",
        "bundleFile": "nurse-female.js"
    },
    "nurse-female-premium-side-left": {
        "id": "nurse-female-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "nurse-female-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "49b5fdf30b0a3fc4250f9efac62efc7e64d0cd5f151683fb9ddb3b4c7ccad3bc",
        "sourceHash": "943fe166ba294ca55141046e845902e671122d0a73f1fafba58f45662a4bfcb7",
        "bundleId": "nurse-female",
        "bundleFile": "nurse-female.js"
    },
    "nurse-female-premium-side-right": {
        "id": "nurse-female-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "nurse-female-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "4cafb21ec6f8e39c1ffb3d1e5980a0f4f99ccc33154eca1b04fd67cd53c972a2",
        "sourceHash": "cad88d0d9840b4a310ce85f96a1d568f549ae5ed311b12cfc9bc8ca17ed3fbac",
        "bundleId": "nurse-female",
        "bundleFile": "nurse-female.js"
    },
    "pilot-premium-back": {
        "id": "pilot-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "pilot-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "beef02b5e395333e313d06f50782333b1f2d1411d2cdf26c90febbcf760a1f56",
        "sourceHash": "f518761fb7ea6c9e0773733ab78b2ac4160e5700f48a63738a9258e82d19f4e5",
        "bundleId": "pilot",
        "bundleFile": "pilot.js"
    },
    "pilot-premium-front": {
        "id": "pilot-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "pilot-premium-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "6ac52f9e5214349d01ef562645e1a895d33a44a7f52b573b1971cc460e42868a",
        "sourceHash": "d23d2afd9660313ce80e0b14c0c89e5fbb584726bc0bb237dc1ec91fc8133be4",
        "bundleId": "pilot",
        "bundleFile": "pilot.js"
    },
    "pilot-premium-side-left": {
        "id": "pilot-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "pilot-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "ac8f7a73649e4103d645a0f8f12b41d6134cad93c07d33e6e8f5d377ab21b20d",
        "sourceHash": "98853b9b56f3d1666fad1f3f64ec0f7fa9f94945bce2513ab9907df19f895f2c",
        "bundleId": "pilot",
        "bundleFile": "pilot.js"
    },
    "pilot-premium-side-right": {
        "id": "pilot-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "pilot-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "5de7de4a03e95a966b09da53d7df68d29981894221a157c427855681c89bbb47",
        "sourceHash": "582d23c2fb83c2ae002eac711d56cd3ea9b2193f2b7f4bff6eedd441b1be8aa4",
        "bundleId": "pilot",
        "bundleFile": "pilot.js"
    },
    "security-officer-premium-back": {
        "id": "security-officer-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "security-officer-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "87520c6f21d3e00ef1294a27a8fe4231b5a8e80db1e6217b901a7163bfe52487",
        "sourceHash": "dc4291d6c3c7a295aa26ddf170a7571474ba985ced0f1566bc7cbb23dcffaf05",
        "bundleId": "security-officer",
        "bundleFile": "security-officer.js"
    },
    "security-officer-premium-front": {
        "id": "security-officer-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "security-officer-premium-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "534c2043a227bf4348d6db58fd4e6de71b151aebbb6875aa2b6dcc48ffbe32b2",
        "sourceHash": "74bfe2e54fafec67f8249463d0b87c3e6edf0f807fde30ca03f64d5fb1185004",
        "bundleId": "security-officer",
        "bundleFile": "security-officer.js"
    },
    "security-officer-premium-side-left": {
        "id": "security-officer-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "security-officer-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "a73a84338428cc8baedb0bf32e5684e202b4001ccf85a63bdfba0218ff92fdcd",
        "sourceHash": "13843807bef50fcb6a38c2152d1859929896672a43ef05795241ceb0691667ac",
        "bundleId": "security-officer",
        "bundleFile": "security-officer.js"
    },
    "security-officer-premium-side-right": {
        "id": "security-officer-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "security-officer-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "deadc9ec75089a05dfa85367eaffa866bcb28740882ca06d7642d266e66aca66",
        "sourceHash": "a3b094f4901cd343e4d38042be8b5689a98d93a8bca4fb356ad11312a8ac05d0",
        "bundleId": "security-officer",
        "bundleFile": "security-officer.js"
    },
    "senator-wear-premium-back": {
        "id": "senator-wear-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "senator-wear-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "bfdc745f75b3c2ba01fb20944df40823094c43894eba1ffd8ff5341ba58e200c",
        "sourceHash": "9557080de6348a2150e7c19ae1fe90d6e832ec9ede07c85e4efa6fbf1530e087",
        "bundleId": "senator-wear",
        "bundleFile": "senator-wear.js"
    },
    "senator-wear-premium-front": {
        "id": "senator-wear-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "curated-six-part-cultural-silhouette-refinement-v2",
        "artworkVersion": "senator-wear-premium-front-authored-v1.2",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "32053ebd6a90de57d1e66c9b1e4f3e6a506c223f3a0b89cd4e25f82caf0fa4c6",
        "sourceHash": "7f78af73caff334fa3ca79b9a121d68908e5d0751fc4527f6ceafcbf20885de0",
        "bundleId": "senator-wear",
        "bundleFile": "senator-wear.js"
    },
    "senator-wear-premium-side-left": {
        "id": "senator-wear-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "senator-wear-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "dedbe055762adc3009eb217f65c97872f61e6e4258d48870cf82678a12941a10",
        "sourceHash": "4a96a2422ef5bd3e29ce2ebfa986ae544f4bd493e91e425afaddfc93baf0b0db",
        "bundleId": "senator-wear",
        "bundleFile": "senator-wear.js"
    },
    "senator-wear-premium-side-right": {
        "id": "senator-wear-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "senator-wear-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "780495dd0adc59faa842d646098318ddc0c489c3ed9e47a5bc3f2b270c0ec81b",
        "sourceHash": "2711dd3027e8ae23df3a60769a135ecaf02b13db1eff5fdf61b97c9fee06738e",
        "bundleId": "senator-wear",
        "bundleFile": "senator-wear.js"
    },
    "soldier-premium-back": {
        "id": "soldier-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "soldier-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "3983ea7878af263e9c97dec0dadbf0152906f3dcf4303b9a9c0a513241079988",
        "sourceHash": "482e51ecc6794b18d377af5c96cb74cdafd4b9140ddc74c7002cde4ad05293b1",
        "bundleId": "soldier",
        "bundleFile": "soldier.js"
    },
    "soldier-premium-front": {
        "id": "soldier-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "soldier-premium-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "4d0e90691a8380ac05e06a83617ecd4e898594d310d2f0793b41e3f863b73463",
        "sourceHash": "d1d5d057e635abb2310f4be14a5834238a1c804874331397fcdbe535b1905f46",
        "bundleId": "soldier",
        "bundleFile": "soldier.js"
    },
    "soldier-premium-side-left": {
        "id": "soldier-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "soldier-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "ad3883f35be594ddf9f94d2b3031bd8addd3fdc52abcdd37953a517dbc31680f",
        "sourceHash": "a917ae435549e5f1638a14f1c5e54b6db913e4f9506fb387242e53eeb9d5cb61",
        "bundleId": "soldier",
        "bundleFile": "soldier.js"
    },
    "soldier-premium-side-right": {
        "id": "soldier-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "soldier-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "b8e4e1ac161bd2e286e9bb038cb4fe14e346331d06bf9e2a2ff3ffe7607946fe",
        "sourceHash": "23658a40453adc281226aabd1901f14f718b25e41f90c76606350a1e91b9ae02",
        "bundleId": "soldier",
        "bundleFile": "soldier.js"
    },
    "teacher-premium-back": {
        "id": "teacher-premium-back",
        "view": "back",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "teacher-premium-back-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "5b6694abe07b0c57740937f0706f5287228f2338a4ffb5d7e6286c8758882984",
        "sourceHash": "15bd0d7228dd09df38c7ca0b1a18f1b401df1ed0c96e04bc182e153cfa49076e",
        "bundleId": "teacher",
        "bundleFile": "teacher.js"
    },
    "teacher-premium-front": {
        "id": "teacher-premium-front",
        "view": "front",
        "roles": [
            "torso",
            "head-neck",
            "right-arm",
            "left-arm",
            "right-leg",
            "left-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "teacher-premium-front-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "f0c4533df91101ec43f52d8002254345f2e8e5b73974eaa8d2dc4e578adf3779",
        "sourceHash": "5ccebb1eedc681c273aa541fca8b793d38cea9829be5f0c48212e606b3811771",
        "bundleId": "teacher",
        "bundleFile": "teacher.js"
    },
    "teacher-premium-side-left": {
        "id": "teacher-premium-side-left",
        "view": "side-left",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "teacher-premium-side-left-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "f9bf3671db6de5c8e60dc35d91a37c5d0d6fb285da5cb379448a5fd39aa017b6",
        "sourceHash": "20e572a5ee11c459362876606ad1a272d9843d95bd9b681f82f1ec4222a4a134",
        "bundleId": "teacher",
        "bundleFile": "teacher.js"
    },
    "teacher-premium-side-right": {
        "id": "teacher-premium-side-right",
        "view": "side-right",
        "roles": [
            "torso",
            "head-neck",
            "front-arm",
            "back-arm",
            "front-leg",
            "back-leg"
        ],
        "runtimeEnabled": true,
        "compatibility": "authored-controls-v1",
        "provenance": "hand-refined-six-part-artwork-from-procedural-renderer-v3",
        "artworkVersion": "teacher-premium-side-right-authored-v1.1",
        "qualityStage": "authored-refinement-2",
        "fallback": "procedural-renderer",
        "signatureHash": "8c074be4538da9ebc8d347c6ec08385e1d248bcbe1bb52e503118802ddf15eb7",
        "sourceHash": "331ca0e6f98560059e4ee2cbefae67f401bea5700d4993f726c0653cd5db1689",
        "bundleId": "teacher",
        "bundleFile": "teacher.js"
    }
});
    const BUNDLE_INDEX = Object.freeze({
    "ada-lecturer": {
        "id": "ada-lecturer",
        "file": "ada-lecturer.js",
        "assetIds": [
            "ada-lecturer-back",
            "ada-lecturer-front",
            "ada-lecturer-side-left",
            "ada-lecturer-side-right"
        ]
    },
    "agbada-formal": {
        "id": "agbada-formal",
        "file": "agbada-formal.js",
        "assetIds": [
            "agbada-formal-premium-back",
            "agbada-formal-premium-front",
            "agbada-formal-premium-side-left",
            "agbada-formal-premium-side-right"
        ]
    },
    "ankara-creative": {
        "id": "ankara-creative",
        "file": "ankara-creative.js",
        "assetIds": [
            "ankara-creative-premium-back",
            "ankara-creative-premium-front",
            "ankara-creative-premium-side-left",
            "ankara-creative-premium-side-right"
        ]
    },
    "business-executive": {
        "id": "business-executive",
        "file": "business-executive.js",
        "assetIds": [
            "business-executive-premium-back",
            "business-executive-premium-front",
            "business-executive-premium-side-left",
            "business-executive-premium-side-right"
        ]
    },
    "chef": {
        "id": "chef",
        "file": "chef.js",
        "assetIds": [
            "chef-premium-back",
            "chef-premium-front",
            "chef-premium-side-left",
            "chef-premium-side-right"
        ]
    },
    "corporate-woman": {
        "id": "corporate-woman",
        "file": "corporate-woman.js",
        "assetIds": [
            "corporate-woman-premium-back",
            "corporate-woman-premium-front",
            "corporate-woman-premium-side-left",
            "corporate-woman-premium-side-right"
        ]
    },
    "engineer-field": {
        "id": "engineer-field",
        "file": "engineer-field.js",
        "assetIds": [
            "engineer-field-premium-back",
            "engineer-field-premium-front",
            "engineer-field-premium-side-left",
            "engineer-field-premium-side-right"
        ]
    },
    "event-host": {
        "id": "event-host",
        "file": "event-host.js",
        "assetIds": [
            "event-host-premium-back",
            "event-host-premium-front",
            "event-host-premium-side-left",
            "event-host-premium-side-right"
        ]
    },
    "female-academic-gown": {
        "id": "female-academic-gown",
        "file": "female-academic-gown.js",
        "assetIds": [
            "female-academic-gown-premium-back",
            "female-academic-gown-premium-front",
            "female-academic-gown-premium-side-left",
            "female-academic-gown-premium-side-right"
        ]
    },
    "female-doctor": {
        "id": "female-doctor",
        "file": "female-doctor.js",
        "assetIds": [
            "female-doctor-back",
            "female-doctor-front",
            "female-doctor-side-left",
            "female-doctor-side-right"
        ]
    },
    "female-student": {
        "id": "female-student",
        "file": "female-student.js",
        "assetIds": [
            "female-student-back",
            "female-student-front",
            "female-student-side-left",
            "female-student-side-right"
        ]
    },
    "football-athlete": {
        "id": "football-athlete",
        "file": "football-athlete.js",
        "assetIds": [
            "football-athlete-premium-back",
            "football-athlete-premium-front",
            "football-athlete-premium-side-left",
            "football-athlete-premium-side-right"
        ]
    },
    "george-wrapper": {
        "id": "george-wrapper",
        "file": "george-wrapper.js",
        "assetIds": [
            "george-wrapper-premium-back",
            "george-wrapper-premium-front",
            "george-wrapper-premium-side-left",
            "george-wrapper-premium-side-right"
        ]
    },
    "iro-buba-woman": {
        "id": "iro-buba-woman",
        "file": "iro-buba-woman.js",
        "assetIds": [
            "iro-buba-premium-back",
            "iro-buba-premium-front",
            "iro-buba-premium-side-left",
            "iro-buba-premium-side-right"
        ]
    },
    "lab-scientist": {
        "id": "lab-scientist",
        "file": "lab-scientist.js",
        "assetIds": [
            "lab-scientist-premium-back",
            "lab-scientist-premium-front",
            "lab-scientist-premium-side-left",
            "lab-scientist-premium-side-right"
        ]
    },
    "lawyer": {
        "id": "lawyer",
        "file": "lawyer.js",
        "assetIds": [
            "lawyer-premium-back",
            "lawyer-premium-front",
            "lawyer-premium-side-left",
            "lawyer-premium-side-right"
        ]
    },
    "male-academic-gown": {
        "id": "male-academic-gown",
        "file": "male-academic-gown.js",
        "assetIds": [
            "male-academic-gown-premium-back",
            "male-academic-gown-premium-front",
            "male-academic-gown-premium-side-left",
            "male-academic-gown-premium-side-right"
        ]
    },
    "male-doctor": {
        "id": "male-doctor",
        "file": "male-doctor.js",
        "assetIds": [
            "male-doctor-back",
            "male-doctor-front",
            "male-doctor-side-left",
            "male-doctor-side-right"
        ]
    },
    "male-lecturer": {
        "id": "male-lecturer",
        "file": "male-lecturer.js",
        "assetIds": [
            "male-lecturer-back",
            "male-lecturer-front",
            "male-lecturer-side-left",
            "male-lecturer-side-right"
        ]
    },
    "male-student": {
        "id": "male-student",
        "file": "male-student.js",
        "assetIds": [
            "male-student-back",
            "male-student-front",
            "male-student-side-left",
            "male-student-side-right"
        ]
    },
    "media-presenter": {
        "id": "media-presenter",
        "file": "media-presenter.js",
        "assetIds": [
            "media-presenter-premium-back",
            "media-presenter-premium-front",
            "media-presenter-premium-side-left",
            "media-presenter-premium-side-right"
        ]
    },
    "neutral-presenter": {
        "id": "neutral-presenter",
        "file": "neutral-presenter.js",
        "assetIds": [
            "neutral-presenter-premium-back",
            "neutral-presenter-premium-front",
            "neutral-presenter-premium-side-left",
            "neutral-presenter-premium-side-right"
        ]
    },
    "nurse-female": {
        "id": "nurse-female",
        "file": "nurse-female.js",
        "assetIds": [
            "nurse-female-premium-back",
            "nurse-female-premium-front",
            "nurse-female-premium-side-left",
            "nurse-female-premium-side-right"
        ]
    },
    "pilot": {
        "id": "pilot",
        "file": "pilot.js",
        "assetIds": [
            "pilot-premium-back",
            "pilot-premium-front",
            "pilot-premium-side-left",
            "pilot-premium-side-right"
        ]
    },
    "security-officer": {
        "id": "security-officer",
        "file": "security-officer.js",
        "assetIds": [
            "security-officer-premium-back",
            "security-officer-premium-front",
            "security-officer-premium-side-left",
            "security-officer-premium-side-right"
        ]
    },
    "senator-wear": {
        "id": "senator-wear",
        "file": "senator-wear.js",
        "assetIds": [
            "senator-wear-premium-back",
            "senator-wear-premium-front",
            "senator-wear-premium-side-left",
            "senator-wear-premium-side-right"
        ]
    },
    "soldier": {
        "id": "soldier",
        "file": "soldier.js",
        "assetIds": [
            "soldier-premium-back",
            "soldier-premium-front",
            "soldier-premium-side-left",
            "soldier-premium-side-right"
        ]
    },
    "teacher": {
        "id": "teacher",
        "file": "teacher.js",
        "assetIds": [
            "teacher-premium-back",
            "teacher-premium-front",
            "teacher-premium-side-left",
            "teacher-premium-side-right"
        ]
    }
});
    const PACKS = Object.create(null);
    const LOADED_BUNDLES = new Set();
    const TRANSIENT_FACE_STATE_KEYS = Object.freeze([
        'mouthWide', 'mouthRound', 'lipPress', 'jawOpen', 'mouthOpeningGain', 'teethVisibility', 'upperLipLift', 'lowerLipDrop'
    ]);

    function clone(value) {
        return value == null ? value : JSON.parse(JSON.stringify(value));
    }

    function canonicalize(value) {
        if (Array.isArray(value)) return value.map(canonicalize);
        if (value && typeof value === 'object') {
            return Object.keys(value).sort().reduce((result, key) => {
                result[key] = canonicalize(value[key]);
                return result;
            }, {});
        }
        return value;
    }

    function readSignature(value) {
        try {
            return JSON.parse(String(value || ''));
        } catch (_) {
            return null;
        }
    }

    function staticSignature(value, controls) {
        const parsed = readSignature(value);
        if (!parsed) return '';
        const next = clone(parsed);
        const adjustments = next.adjustments && typeof next.adjustments === 'object' ? next.adjustments : {};
        const faceState = next.faceState && typeof next.faceState === 'object' ? next.faceState : {};
        const identity = next.identity && typeof next.identity === 'object' ? next.identity : {};
        const styling = next.styling && typeof next.styling === 'object' ? next.styling : {};
        if (Array.isArray(styling.accessories)) styling.accessories = [...styling.accessories].sort();
        (controls?.identity || []).forEach(key => delete identity[key]);
        (controls?.styling || []).forEach(key => delete styling[key]);
        (controls?.adjustments || []).forEach(key => delete adjustments[key]);
        (controls?.faceState || []).forEach(key => delete faceState[key]);
        TRANSIENT_FACE_STATE_KEYS.forEach(key => delete faceState[key]);
        next.identity = identity;
        next.styling = styling;
        next.adjustments = adjustments;
        next.faceState = faceState;
        return JSON.stringify(canonicalize(next));
    }

    function unsupportedAccessories(pack, renderSignature) {
        if (!pack?.controls?.styling?.includes('accessories')) return [];
        const parsed = readSignature(renderSignature);
        const requested = Array.isArray(parsed?.styling?.accessories) ? parsed.styling.accessories : [];
        const baseline = readSignature(pack.signature);
        const baselineAccessories = new Set(
            Array.isArray(baseline?.styling?.accessories) ? baseline.styling.accessories : []
        );
        const supported = new Set(pack.supportedAccessories || []);
        return [...new Set(requested.filter(accessory => (
            !supported.has(accessory) && !baselineAccessories.has(accessory)
        )))].sort();
    }

    function collectDifferences(expected, actual, prefix = '', result = []) {
        if (expected === actual) return result;
        if (Array.isArray(expected) || Array.isArray(actual)) {
            if (JSON.stringify(expected) !== JSON.stringify(actual)) result.push(prefix || 'signature');
            return result;
        }
        if (expected && actual && typeof expected === 'object' && typeof actual === 'object') {
            const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
            [...keys].sort().forEach(key => collectDifferences(
                expected[key],
                actual[key],
                prefix ? prefix + '.' + key : key,
                result
            ));
            return result;
        }
        result.push(prefix || 'signature');
        return result;
    }

    function validatePack(pack) {
        const errors = [];
        if (!pack?.id) errors.push('pack id is required');
        if (pack?.runtimeEnabled !== true) errors.push('runtimeEnabled must be true');
        if (!pack?.artworkVersion || pack.artworkVersion === 'unversioned') errors.push('artworkVersion is required');
        if (!pack?.qualityStage || pack.qualityStage === 'unreviewed') errors.push('qualityStage is required');
        if (!pack?.signature) errors.push('render signature is required');
        if (!['exact-signature', 'authored-controls-v1'].includes(pack?.compatibility)) errors.push('unsupported compatibility mode');
        if (pack?.compatibility === 'authored-controls-v1' && (!pack?.controls?.adjustments?.length || !pack?.controls?.faceState?.length)) {
            errors.push('authored-controls-v1 control declarations are required');
        }
        const roles = Array.isArray(pack?.roles) && pack.roles.length ? pack.roles : REQUIRED_ROLES;
        roles.forEach(role => {
            const svg = pack?.parts?.[role];
            if (!svg) errors.push(`missing part ${role}`);
            else {
                try {
                    global.SvgCharacterUtils?.assertSafeGeneratedSvg?.(svg);
                } catch (error) {
                    errors.push(`${role}: ${error.message}`);
                }
            }
        });
        return { ok: errors.length === 0, assetId: pack?.id || '', errors };
    }

    function freezePack(pack) {
        Object.freeze(pack.roles || []);
        Object.freeze(pack.parts || {});
        Object.values(pack.controls || {}).forEach(value => {
            if (Array.isArray(value)) Object.freeze(value);
        });
        if (pack.controls) Object.freeze(pack.controls);
        if (Array.isArray(pack.supportedAccessories)) Object.freeze(pack.supportedAccessories);
        return Object.freeze(pack);
    }

    function resolveIndexedAssetId(assetId) {
        const requested = String(assetId || '').trim();
        if (INDEX[requested]) return requested;
        const sourceViewId = requested.replace(/-(front|back)-3q-(?:left|right)$/, '-$1');
        return INDEX[sourceViewId] ? sourceViewId : '';
    }

    function getBundleForAsset(assetId) {
        const requestedAssetId = String(assetId || '').trim();
        const resolvedAssetId = resolveIndexedAssetId(requestedAssetId);
        const entry = INDEX[resolvedAssetId];
        const bundle = entry ? BUNDLE_INDEX[entry.bundleId] : null;
        return bundle ? clone({ ...bundle, requestedAssetId, resolvedAssetId }) : null;
    }

    function registerBundle(bundleId, bundlePacks) {
        const normalizedBundleId = String(bundleId || '').trim();
        const bundle = BUNDLE_INDEX[normalizedBundleId];
        if (!bundle) throw new Error(`Unknown authored SVG artwork bundle: ${normalizedBundleId}`);
        const incoming = bundlePacks && typeof bundlePacks === 'object' ? bundlePacks : {};
        const incomingIds = Object.keys(incoming).sort();
        const expectedIds = [...bundle.assetIds].sort();
        const missing = expectedIds.filter(id => !Object.hasOwn(incoming, id));
        const unexpected = incomingIds.filter(id => !expectedIds.includes(id));
        if (missing.length || unexpected.length) {
            throw new Error(`Authored SVG bundle ${normalizedBundleId} does not match its index (missing: ${missing.join(', ') || 'none'}; unexpected: ${unexpected.join(', ') || 'none'}).`);
        }
        const prepared = {};
        expectedIds.forEach(assetId => {
            const pack = incoming[assetId];
            if (String(pack?.id || '') !== assetId) throw new Error(`Authored SVG pack id mismatch for ${assetId}.`);
            if (INDEX[assetId]?.bundleId !== normalizedBundleId) throw new Error(`Authored SVG pack ${assetId} belongs to another bundle.`);
            const validation = validatePack(pack);
            if (!validation.ok) throw new Error(`Invalid authored SVG pack ${assetId}: ${validation.errors.join('; ')}`);
            prepared[assetId] = freezePack(pack);
        });
        Object.entries(prepared).forEach(([assetId, pack]) => {
            PACKS[assetId] = pack;
        });
        LOADED_BUNDLES.add(normalizedBundleId);
        if (typeof global.dispatchEvent === 'function' && typeof global.CustomEvent === 'function') {
            global.dispatchEvent(new global.CustomEvent('svg-african-authored-artwork:bundle', {
                detail: { bundleId: normalizedBundleId, assetIds: [...expectedIds] }
            }));
        }
        return getBundleInfo(normalizedBundleId);
    }

    function getPackInfo(assetId) {
        const id = String(assetId || '');
        const indexEntry = INDEX[id];
        if (!indexEntry) return null;
        const pack = PACKS[id];
        if (!pack) {
            return clone({
                ...indexEntry,
                loaded: false,
                partsLoaded: false,
                partCount: 0,
                expectedPartCount: indexEntry.roles.length,
                controls: null,
                supportedAccessories: [],
                ok: true,
                errors: []
            });
        }
        const validation = validatePack(pack);
        return {
            id: pack.id,
            view: pack.view,
            runtimeEnabled: pack.runtimeEnabled,
            compatibility: pack.compatibility,
            provenance: pack.provenance,
            artworkVersion: pack.artworkVersion,
            qualityStage: pack.qualityStage,
            fallback: pack.fallback,
            roles: clone(pack.roles || REQUIRED_ROLES),
            supportedAccessories: clone(pack.supportedAccessories || []),
            controls: clone(pack.controls),
            signatureHash: pack.signatureHash,
            sourceHash: pack.sourceHash,
            bundleId: indexEntry.bundleId,
            bundleFile: indexEntry.bundleFile,
            loaded: true,
            partsLoaded: true,
            partCount: Object.keys(pack.parts || {}).length,
            expectedPartCount: indexEntry.roles.length,
            ...validation
        };
    }

    function getPartSvg(assetId, partKey) {
        const pack = PACKS[String(assetId || '')];
        return String(pack?.parts?.[String(partKey || '')] || '');
    }

    function getRequiredRoles(assetId) {
        const id = resolveIndexedAssetId(assetId);
        return clone(INDEX[id]?.roles || REQUIRED_ROLES);
    }

    function getCompatiblePartSvg(assetId, partKey, renderSignature) {
        const pack = PACKS[String(assetId || '')];
        if (!pack || pack.runtimeEnabled !== true) return '';
        const requested = String(renderSignature || '');
        if (unsupportedAccessories(pack, requested).length) return '';
        const compatible = pack.compatibility === 'authored-controls-v1'
            ? staticSignature(pack.signature, pack.controls) === staticSignature(requested, pack.controls)
            : pack.signature === requested;
        if (!compatible) return '';
        return getPartSvg(assetId, partKey);
    }

    function explainCompatibility(assetId, renderSignature) {
        const id = String(assetId || '');
        const indexEntry = INDEX[id];
        if (!indexEntry) return { compatible: false, available: false, loaded: false, changedPaths: ['asset'] };
        const pack = PACKS[id];
        if (!pack) return { compatible: false, available: true, loaded: false, changedPaths: ['artworkPayload'] };
        if (pack.runtimeEnabled !== true) return { compatible: false, available: true, loaded: true, changedPaths: ['runtimeEnabled'] };
        const expected = staticSignature(pack.signature, pack.controls);
        const requested = staticSignature(String(renderSignature || ''), pack.controls);
        const expectedValue = readSignature(expected);
        const requestedValue = readSignature(requested);
        if (!expectedValue || !requestedValue) {
            return { compatible: false, available: true, loaded: true, changedPaths: ['signature'] };
        }
        const changedPaths = collectDifferences(expectedValue, requestedValue);
        unsupportedAccessories(pack, renderSignature).forEach(accessory => changedPaths.push('styling.accessories.' + accessory));
        return {
            compatible: changedPaths.length === 0,
            available: true,
            loaded: true,
            changedPaths: [...new Set(changedPaths)].sort()
        };
    }

    function getControlBaseline(assetId) {
        const pack = PACKS[String(assetId || '')];
        const signature = readSignature(pack?.signature);
        if (!pack || !signature) return null;
        return clone({
            compatibility: pack.compatibility,
            controls: pack.controls,
            supportedAccessories: pack.supportedAccessories || [],
            adjustments: signature.adjustments || {},
            faceState: signature.faceState || {}
        });
    }

    function getBundleInfo(bundleId) {
        const bundle = BUNDLE_INDEX[String(bundleId || '')];
        return bundle ? clone({ ...bundle, loaded: LOADED_BUNDLES.has(bundle.id) }) : null;
    }

    function listBundles() {
        return Object.keys(BUNDLE_INDEX).map(getBundleInfo).filter(Boolean);
    }

    function isBundleLoaded(bundleId) {
        return LOADED_BUNDLES.has(String(bundleId || ''));
    }

    function isPackLoaded(assetId) {
        const bundle = getBundleForAsset(assetId);
        return !!bundle && isBundleLoaded(bundle.id);
    }

    function areAllPacksLoaded() {
        return LOADED_BUNDLES.size === Object.keys(BUNDLE_INDEX).length;
    }

    function list() {
        return Object.keys(INDEX).map(getPackInfo).filter(Boolean).map(clone);
    }

    function validateCatalog(options = {}) {
        const requireAllLoaded = options.requireAllLoaded === true;
        const results = Object.keys(INDEX).map(assetId => {
            if (PACKS[assetId]) return { ...validatePack(PACKS[assetId]), loaded: true };
            return {
                ok: !requireAllLoaded,
                assetId,
                loaded: false,
                errors: requireAllLoaded ? ['artwork payload is not loaded'] : []
            };
        });
        return {
            ok: results.every(result => result.ok),
            packCount: Object.keys(INDEX).length,
            loadedPackCount: Object.keys(PACKS).length,
            bundleCount: Object.keys(BUNDLE_INDEX).length,
            loadedBundleCount: LOADED_BUNDLES.size,
            results: clone(results),
            errors: results.flatMap(result => result.errors)
        };
    }

    global.SvgAfricanAuthoredArtwork = Object.freeze({
        catalogVersion: 1,
        requiredRoles: REQUIRED_ROLES,
        sideRequiredRoles: SIDE_REQUIRED_ROLES,
        registerBundle,
        getBundleForAsset,
        getBundleInfo,
        listBundles,
        isBundleLoaded,
        isPackLoaded,
        areAllPacksLoaded,
        getRequiredRoles,
        getPackInfo,
        getPartSvg,
        getCompatiblePartSvg,
        explainCompatibility,
        getControlBaseline,
        list,
        validateCatalog
    });
})(typeof globalThis !== 'undefined' ? globalThis : window);
