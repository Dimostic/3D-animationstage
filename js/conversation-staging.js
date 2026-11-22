/* Conversation staging reuses the armature recorder and its view-aware activity kits. */
(() => {
    'use strict';
    const copy = value => Utils.deepClone(value);
    const layouts = {
        'three-quarter': 'Standing conversation', 'face-to-face': 'Face to face',
        'seated-pair': 'Seated conversation', 'desk': 'Across a desk', 'mixed': 'Seated host and visitor',
        'presentation': 'Presenter and listeners', 'classroom': 'Teacher and seated students',
        'over-shoulder': 'Over the shoulder', 'group': 'Group discussion',
        'community-circle': 'Community gathering', 'market-row': 'Market crowd', 'walkway': 'Walking group'
    };
    const views = { front: 'Front', 'side-right': 'Side facing right', 'side-left': 'Side facing left',
        'front-3q-right': '3/4 facing right', 'front-3q-left': '3/4 facing left',
        back: 'Back', 'back-3q-right': 'Back 3/4 right', 'back-3q-left': 'Back 3/4 left' };
    const activities = { none: 'Conversation', read: 'Read book', write: 'Write', type: 'Type', eat: 'Eat seated', microphone: 'Hold microphone' };
    const poseCandidates = {
        eat: ['sit-eating', 'sit-eating-side', 'sit-eating-back'],
        read: ['read-book-seated', 'read-book-seated-side', 'read-book-seated-back', 'reading-book'],
        write: ['write-seated', 'write-seated-side', 'write-seated-back', 'writing-typing'],
        type: ['type-seated', 'type-seated-side', 'type-seated-back', 'writing-typing'],
        microphone: ['hold-microphone', 'hold-microphone-side', 'hold-microphone-back']
    };

    class ConversationStaging {
        static layouts = layouts;
        static views = views;
        static activities = activities;
        constructor(manager) { this.manager = manager; this.app = manager.app; }
        defaults(layout, index, count) {
            const left = index === 0;
            const spread = count > 1 ? .15 + .7 * index / (count - 1) : .5;
            const value = { view: left ? 'front-3q-right' : 'front-3q-left', posture: 'standing',
                seat: 'chair', activity: 'none', entrance: 'none', exit: 'none', closingTurn: 'none', actionSeconds: 2.8,
                reaction: 'nod', ambientMovement: 'idle', distance: 14, x: spread, ground: .81 };
            if (['face-to-face', 'desk'].includes(layout)) value.view = left ? 'side-right' : 'side-left';
            if (['seated-pair', 'desk'].includes(layout)) value.posture = 'seated';
            if (layout === 'seated-pair') value.view = left ? 'side-right' : 'side-left';
            if (layout === 'mixed') { value.view = left ? 'side-right' : 'side-left'; value.posture = left ? 'seated' : 'standing'; }
            if (['presentation', 'classroom'].includes(layout)) {
                value.view = left ? 'front' : 'side-left';
                value.x = layout === 'classroom' ? index === 0 ? .16 : .34 + .52 * (index - 1) / Math.max(1, count - 2)
                    : count === 3 ? [.25, .61, .83][index] : spread;
                value.posture = layout === 'classroom' && !left ? 'seated' : 'standing';
            }
            if (layout === 'over-shoulder') { value.view = left ? 'front-3q-right' : 'back-3q-left'; value.ground = left ? .76 : .86; }
            if (layout === 'group') value.view = index === 1 ? 'front' : left ? 'side-right' : 'side-left';
            if (layout === 'community-circle') {
                const middle = (count - 1) / 2;
                value.view = index < middle ? 'front-3q-right' : index > middle ? 'front-3q-left' : 'front';
                value.posture = index > 0 && index % 2 === 1 ? 'seated' : 'standing';
                value.x = count > 1 ? .13 + .74 * index / (count - 1) : .5;
                value.ground = .78 + .06 * Math.abs((index / Math.max(1, count - 1)) - .5);
            }
            if (layout === 'market-row') value.view = index < count / 2 ? 'side-right' : 'side-left';
            if (layout === 'walkway') { value.view = 'side-right'; value.ambientMovement = 'walk-right'; }
            return value;
        }
        initialize(data, definition = {}) {
            data.layout ||= definition.layout || (data.seated ? 'seated-pair' : 'three-quarter');
            data.cast.forEach((actor, index) => {
                actor.staging = { ...this.defaults(data.layout, index, data.cast.length),
                    ...(!definition.layout && !data.stagingVersion && actor.config?.styling?.view ? { view: actor.config.styling.view } : {}),
                    ...(actor.staging || {}), ...(definition.staging?.[actor.id] || {}) };
            });
            data.stagingVersion = 1;
        }
        chooseLayout(data, layout) {
            if (!layouts[layout]) throw new Error('Choose a conversation layout.');
            data.layout = layout;
            data.cast.forEach((actor, index) => {
                const next = this.defaults(layout, index, data.cast.length);
                next.reaction = actor.staging?.reaction || 'nod';
                if (next.view.startsWith('side-') && actor.staging?.ambientMovement) {
                    next.ambientMovement = actor.staging.ambientMovement;
                }
                actor.staging = next;
            });
        }
        poseKey(rig, actor) {
            const catalog = this.app.jointSystem._getActiveArmaturePoseCatalog(rig);
            const s = actor.staging;
            const choices = s.activity !== 'none' ? poseCandidates[s.activity]
                : s.posture === 'seated' ? ['sitting-chair', 'sit', 'sit-side', 'sit-back-true-sides', 'sit-back'] : ['idle', 'stand', 'neutral'];
            return choices?.find(key => catalog[key] && this.app.jointSystem._armaturePoseMatchesCurrentView(rig, { ...catalog[key], key }));
        }
        pose(rig, actor) {
            const catalog = this.app.jointSystem._getActiveArmaturePoseCatalog(rig);
            const pose = catalog[this.poseKey(rig, actor)];
            if (actor.staging.activity !== 'microphone' || actor.staging.posture !== 'seated') return pose;
            const seatedActor = { ...actor, staging: { ...actor.staging, activity: 'none' } };
            const seat = catalog[this.poseKey(rig, seatedActor)];
            const upper = values => Object.fromEntries(Object.entries(values || {}).filter(([key]) => !/hip|knee|ankle|leg/.test(key)));
            return { ...seat, ...pose, name: `${pose.name} (Seated)`, seatDepth: seat.seatDepth,
                jointAngles: { ...seat.jointAngles, ...upper(pose.jointAngles) },
                jointTilts: { ...seat.jointTilts, ...upper(pose.jointTilts) },
                partAngles: { ...seat.partAngles, ...upper(pose.partAngles) },
                partTilts: { ...seat.partTilts, ...upper(pose.partTilts) }, grounding: seat.grounding };
        }
        validate(actor) {
            const s = actor.staging;
            if (!views[s.view] || !activities[s.activity] || !['standing', 'seated'].includes(s.posture)
                || !['chair', 'bench', 'none'].includes(s.seat)
                || !['none', 'walk', 'sit', 'walk-sit'].includes(s.entrance)
                || !['none', 'walk', 'stand', 'stand-walk'].includes(s.exit)
                || !['none','front','back','side:right','side:left'].includes(s.closingTurn || 'none')
                || !['nod', 'raise-hand', 'idle'].includes(s.reaction || 'nod')
                || !['idle', 'walk-right', 'walk-left'].includes(s.ambientMovement || 'idle')
                || !Number.isFinite(s.actionSeconds) || s.actionSeconds < 1.5 || s.actionSeconds > 8
                || !Number.isFinite(s.x) || s.x < .05 || s.x > .95
                || !Number.isFinite(s.ground) || s.ground < .3 || s.ground > .95
                || !Number.isFinite(s.distance) || s.distance < 5 || s.distance > 25) throw new Error('Choose valid staging settings.');
            if (s.activity !== 'none' && /3q/.test(s.view)) throw new Error('Activity props need a front, side or back view. Choose one before adding an activity.');
            if (['read', 'write', 'type', 'eat'].includes(s.activity) && s.posture !== 'seated') throw new Error('Reading, writing, typing and seated eating require a seated posture.');
            if ((/sit/.test(s.entrance) || /stand/.test(s.exit)) && s.posture !== 'seated') throw new Error('Sit and stand transitions need a seated conversation posture.');
            if ((s.entrance === 'walk' || s.exit === 'walk') && s.posture === 'seated') throw new Error('Choose Walk in and sit or Stand and walk out for a seated character.');
            if ((/walk/.test(s.entrance) || /walk/.test(s.exit)) && !s.view.startsWith('side-')) throw new Error('Walking entrances and exits currently require a side view.');
            if (s.ambientMovement !== 'idle' && !s.view.startsWith('side-')) throw new Error('Ambient walking requires a side view.');
            if ((s.entrance !== 'none' || s.exit !== 'none') && s.activity !== 'none') throw new Error('Use Conversation activity for entrance and exit actions; occupied-hand activities stay at their station.');
            if(s.closingTurn && s.closingTurn!=='none' && (s.exit!=='none'||s.activity!=='none'||s.ambientMovement!=='idle'))throw Error('A closing body turn requires no exit, activity kit or background walk.');
        }
        propState(obj) {
            const state = obj.toJSON();
            delete state.animations;
            return JSON.stringify(state, (key, value) => typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(5)) : value);
        }
        protectedProp(data, obj) {
            if (![...(data.furnitureIds || []), ...(data.activityPropIds || [])].includes(obj.id)) return false;
            const baseline = data.stagingProps?.[obj.id];
            return obj.locked || !baseline || baseline.state !== this.propState(obj)
                || (obj.animations || []).some(a => a._conversationId !== data.groupId);
        }
        ownProp(data, obj, actorId, role) {
            data.stagingProps ||= {};
            data.stagingProps[obj.id] = { state: this.propState(obj), actorId, role };
        }
        retainedProp(data, actorId, role) {
            return this.app.objects.objects.find(o => {
                const owner = data.stagingProps?.[o.id];
                const actor = data.cast.find(a => a.id === actorId);
                return this.protectedProp(data, o) && ((owner?.actorId === actorId && owner?.role === role)
                    || (o.sceneAsset?.activityRootId === actor?.rootId && o.sceneAsset?.activityRole === role)
                    || (role === 'chair' && actor?.stagingChairId === o.id));
            });
        }
        removeProps(data, key, actors = null) {
            const ids = new Set(data[key] || []);
            this.app.objects.objects = this.app.objects.objects.filter(o => {
                if (!ids.has(o.id) || this.protectedProp(data, o)) return true;
                const owner = data.stagingProps?.[o.id];
                if (actors && !actors.some(a => a.id === owner?.actorId)) return true;
                delete data.stagingProps?.[o.id];
                return false;
            });
            data[key] = [...ids].filter(id => this.app.objects.getObjectById(id));
        }
        async apply(data, actors = data.cast, arrange = false) {
            const stamp = actor => JSON.stringify([actor.rootId, actor.staging, data.layout]);
            actors = actors.filter(actor => data.stagingApplied?.[actor.id] !== stamp(actor));
            if (!actors.length) return;
            const system = this.app.jointSystem;
            actors.forEach(actor => this.validate(actor));
            for (const actor of actors) {
                const rig = this.manager.rigFor(actor.rootId);
                if (!rig) throw new Error(`Reconnect ${actor.name} to a character.`);
                if (!rig.root._svgCharacter && actor.staging.view.startsWith('back')) {
                    throw new Error('UC conversation staging supports front, side and front 3/4 views. Choose one of these views.');
                }
                if (system._getArmatureObjects(rig).some(o => o.animations.some(a => a._conversationId !== data.groupId))) {
                    throw new Error(`Remove or finish editing ${actor.name}'s independent timeline movements before changing staging. Dialogue and audio have been retained.`);
                }
            }
            this.removeProps(data, 'furnitureIds', arrange ? null : actors);
            for (const actor of actors) {
                let rig = this.manager.rigFor(actor.rootId);
                await system._crossViewDecode(rig);
                const svg = !!rig.root._svgCharacter;
                const current = svg ? system._getSvgAfricanPremiumViewKey(rig)
                    : system._getUniversalCharacterCurrentViewSwitchKey(rig).replace(':', '-');
                const anchor = system._crossViewAnchor(rig);
                system._captureArmatureStageBasePosition(rig);
                rig = system._resetArmatureToActiveCatalogIdle(rig) || rig;
                const standingHeight = system._crossViewAnchor(rig).height;
                if (current !== actor.staging.view && !svg) {
                    const target = actor.staging.view.replace(/^(side|front-3q)-/, '$1:');
                    rig = await system._switchArmatureCrossView(rig, target);
                } else if (current !== actor.staging.view) {
                    const physicalKey = (key, view) => key.replace(/^(front|back)-(arm|leg)$/, (_, near, limb) =>
                        `${(near === 'front') === !view.endsWith('left') ? 'right' : 'left'}-${limb}`);
                    const scale = rig.root.height / rig.root._svgAfricanPartProfile.height;
                    const sizes = new Map(Object.entries(rig.parts).map(([key, part]) => {
                        const profile = part.obj._svgAfricanPartProfile;
                        return [physicalKey(key, current), profile ? { x: part.obj.width / profile.width / scale,
                            y: part.obj.height / profile.height / scale } : { x: 1, y: 1 }];
                    }));
                    rig = system._switchSvgAfricanPremiumView(rig, actor.staging.view, {
                        allowStructuralSwitch: true, stopMovement: false, rebuildPanel: false, pushHistory: false, toast: false
                    });
                    if (!rig) throw new Error('This character could not change view.');
                    // Cross-family widths are authored differently. Rebase on the destination
                    // profiles before carrying over user proportions, rather than compounding widths.
                    system.updateSvgAfricanCharacterAppearance(rig, {}, {
                        pushHistory: false, render: false, updateObjectList: false, updateProperties: false
                    });
                    const config = rig.root._svgCharacterConfig;
                    const asset = SvgAfricanPremiumAssets.resolveAssetForConfig(config);
                    for (const [key, part] of Object.entries(rig.parts)) {
                        const ratio = sizes.get(physicalKey(key, actor.staging.view));
                        if (ratio) { part.obj.width *= ratio.x; part.obj.height *= ratio.y; }
                    }
                    system._syncSvgAfricanContinuousGarment(rig, { config, asset, render: false, updateObjectList: false, updateProperties: false });
                    await system._crossViewDecode(rig);
                    const next = system._crossViewAnchor(rig);
                    system._scaleArmatureUniform(rig, standingHeight / next.height, { toast: false, pushHistory: false });
                }
                const key = this.poseKey(rig, actor);
                if (!key && actor.staging.posture === 'seated') throw new Error(`No seated pose is available for ${actor.name}'s view.`);
                if (key) system._applyArmaturePose(rig, this.pose(rig, actor), false);
                const next = system._crossViewAnchor(rig);
                const x = arrange ? this.app.stage.width * actor.staging.x : anchor.x;
                const y = arrange ? this.app.stage.height * actor.staging.ground : anchor.y;
                system._setArmatureRootPosition(rig, rig.root.x + x - next.x, rig.root.y + y - next.y);
                this.app.objects._resolvePins();
                system._captureArmatureStageBasePosition(rig);
                if (svg) actor.config = copy(rig.root._svgCharacterConfig);
            }
            for (const actor of actors) {
                const rig = this.manager.rigFor(actor.rootId);
                if (rig && actor.staging.posture === 'seated' && actor.staging.seat !== 'none'
                    && !this.retainedProp(data, actor.id, 'chair')) {
                    const chair = this.manager.fitChair(rig, actor.staging.seat);
                    data.furnitureIds.push(chair.id);
                    this.ownProp(data, chair, actor.id, 'chair');
                }
            }
            if (data.layout === 'desk' && !(data.furnitureIds || []).some(id => data.stagingProps?.[id]?.role === 'desk'
                || (!data.stagingProps?.[id] && this.app.objects.getObjectById(id)?.sceneAsset?.propId === 'table'))) this.addDesk(data);
            this.app.objects._resolvePins();
            data.stagingApplied ||= {};
            actors.forEach(actor => { data.stagingApplied[actor.id] = stamp(actor); });
        }
        addDesk(data) {
            const rig = this.manager.rigFor(data.cast[0].rootId);
            const head = rig.parts['head-neck']?.obj;
            const H = this.app.stage.height, W = this.app.stage.width;
            const top = head ? head.y + head.height + rig.root.height * .5 : H * .55;
            const height = Math.max(H * .14, H * .81 - top) / ((84 - 26) / 90);
            const item = this.app.objects._propById.table;
            if (!item) return;
            const doc = new DOMParser().parseFromString(item.svg, 'image/svg+xml');
            doc.documentElement.setAttribute('preserveAspectRatio', 'none');
            const desk = new StageObject('image', { name: 'Conversation table', x: W * .37, y: top - height * 26 / 90,
                width: W * .26, height, imageSrc: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(doc)),
                sceneAsset: SceneDesign.metadata('table'), strokeWidth: 0 });
            this.app.objects.addObject(desk); data.furnitureIds.push(desk.id);
            this.ownProp(data, desk, null, 'desk');
        }
        entryDuration(actor) {
            const s = actor.staging;
            return s ? (s.entrance.includes('walk') ? s.actionSeconds * 1000 : 0) + (s.entrance.includes('sit') ? 1800 : 0) : 0;
        }
        handoffPlan(data) {
            const turns=data.turns.filter(t=>t.action==='handoff');
            if(turns.length||this.app.objects.objects.some(o=>o.sceneAsset?.conversationHandoff?.groupId===data.groupId)){
                if(this.app.animations.isPlaying)throw Error('Stop playback before rebuilding a prop handoff.');
                this.app.animations.restoreBaseState();
                this.app.objects._resolvePins();
            }
            if(!turns.length)return null;
            const exchanges=turns.map((turn,index)=>{
            const giver=data.cast.find(a=>a.id===turn.speaker),receiver=data.cast.find(a=>a.id===turn.handoffTo);
            if(!giver||!receiver||giver===receiver)throw Error('Choose another character to receive the prop.');
            if(index&&turns[index-1].handoffTo!==turn.speaker)throw Error('The next handoff must start with the character who holds the prop.');
            if(!['before','after'].includes(turn.actionTiming||'after'))throw Error('Place the handoff before or after speech.');
            if(!['notebook','activity-folder','activity-parcel'].includes(turn.handoffProp||'notebook'))throw Error('Choose a notebook, folder or small parcel.');
            const seconds=Number(turn.actionSeconds??3);
            if(!Number.isFinite(seconds)||seconds<2||seconds>8)throw Error('A handoff needs 2 to 8 seconds.');
            const actors=[giver,receiver],system=this.app.jointSystem;
            for(const actor of actors){
                const s=actor.staging,rig=this.manager.rigFor(actor.rootId);
                if(!rig||!s?.view?.startsWith('side-')||!['standing','seated'].includes(s.posture)||s.activity!=='none'||s.ambientMovement!=='idle'
                    ||s.entrance!=='none'||s.exit!=='none'||(s.closingTurn&&s.closingTurn!=='none'))throw Error(`${actor.name}: handoffs require a side view without an activity, entrance, exit or body turn.`);
                if(data.turns.some(t=>t!==turn&&t.speaker===actor.id&&t.action&&!['none','handoff'].includes(t.action))||(data.aiActions||[]).some(a=>a.actor===actor.id))throw Error(`${actor.name}: remove other body actions from this handoff scene.`);
                if(system._getArmatureObjects(rig).some(o=>(o.animations||[]).some(a=>a._conversationId!==data.groupId)))throw Error(`${actor.name}: remove independent movement tracks before adding a handoff.`);
            }
            const left=giver.staging.x<receiver.staging.x?giver:receiver,right=left===giver?receiver:giver;
            if(left.staging.view!=='side-right'||right.staging.view!=='side-left')throw Error('The two handoff characters must face each other.');
            return {turn,giver,receiver,actors,seconds};
            });
            if(this.app.objects.objects.some(o=>o.sceneAsset?.conversationHandoff?.groupId===data.groupId&&this.protectedProp(data,o)))throw Error('The handoff prop has manual edits or is locked. Remove that prop or restore it before rebuilding the exchange.');
            return {...exchanges[0],exchanges,actors:[...new Set(exchanges.flatMap(p=>p.actors))]};
        }
        resolveHandoffHand(rig,hand,towardX) {
            const system=this.app.jointSystem,map=system._getArmatureContactSourceMap(rig);
            if(map[hand])return hand;
            if(!['front-hand','back-hand'].includes(hand))throw Error(`This view has no ${hand.replaceAll('-',' ')}.`);
            const choices=['left-hand','right-hand'].filter(key=>map[key]).sort((a,b)=>{
                const x=key=>system._getArmatureContactPointWorldPosition(map[key].obj,map[key].joints[0]).x;
                return Math.abs(x(a)-towardX)-Math.abs(x(b)-towardX);
            });
            if(!choices.length)throw Error('This view has no compatible hand.');
            return hand==='front-hand'?choices[0]:choices.at(-1);
        }
        handoffHand(rig, hand='front-hand') {
            if(!['front-hand','back-hand','left-hand','right-hand'].includes(hand))throw Error('Choose a valid hand for the exchange.');
            const source=this.app.jointSystem._getArmatureContactSourceMap(rig)[hand];
            const wrist=source?.joints.find(j=>/wrist/.test(j.name));
            return wrist?{...source,endPosition:wrist.position+(1-wrist.position)*.45,endCrossOffset:wrist.crossOffset??.5}:null;
        }
        async handoffClip(data, plan, start, sceneEnd) {
            const system=this.app.jointSystem,rigs=plan.actors.map(a=>this.manager.rigFor(a.rootId));
            const snapshot=system._armatureActionSnapshot(rigs[0]);
            const duration=plan.seconds*1000,end=start+duration,total=Math.max(sceneEnd,end+1);
            const sources=rigs.map((rig,i)=>this.handoffHand(rig,plan.turn[i?'handoffReceiverHand':'handoffGiverHand']||'front-hand'));
            if(sources.some(s=>!s||s.joints.length<3))throw Error('Both characters need a complete front arm and hand.');
            const item=Object.values(BUILTIN_PROP_LIBRARY.items).flat().find(p=>p.id===(plan.turn.handoffProp||'notebook'));
            if(!item)throw Error('The handoff prop is unavailable.');
            const point=s=>system._getArmatureEndEffectorWorldPosition(s);
            const shoulders=sources.map(s=>system._getArmatureContactPointWorldPosition(s.obj,s.joints[0]));
            const idle=sources.map(point),lengths=sources.map((s,i)=>{
                if(plan.actors[i].staging.posture!=='seated'&&!plan.continuation)return Math.hypot(idle[i].x-shoulders[i].x,idle[i].y-shoulders[i].y);
                const points=[...s.joints.map(j=>system._getArmatureContactPointWorldPosition(s.obj,j)),idle[i]];
                return points.slice(1).reduce((sum,p,index)=>sum+Math.hypot(p.x-points[index].x,p.y-points[index].y),0);
            });
            const size=Number(plan.turn.handoffScale??1);
            if(!Number.isFinite(size)||size<.5||size>2)throw Error('Prop size must be between 50% and 200%.');
            const custom=plan.turn.handoffArtwork;
            if(custom&&(!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(custom.src||'')||custom.src.length>6*1024*1024
                ||!Number.isFinite(custom.width)||!Number.isFinite(custom.height)||custom.width<=0||custom.height<=0))throw Error('Upload the custom handoff image again.');
            const unit=Math.min(...lengths),width=plan.dimensions?.width??unit*.3*size,height=plan.dimensions?.height??width*(custom?custom.height/custom.width:item.h/item.w);
            if(height>unit*.85)throw Error('This prop is too tall for a handoff. Crop the image or reduce its scale.');
            const sign=shoulders[0].x<shoulders[1].x?1:-1;
            const facing=rigs.map(r=>system._getUniversalCharacterCurrentViewSwitchKey(r));
            if(facing.some((view,i)=>view.startsWith('side:')?view!==`side:${(i===0?sign:-sign)>0?'right':'left'}`:view!=='front'&&!view.startsWith('front-3q:')))
                throw Error('Use front, front three-quarter, or side-view characters facing each other for the handoff.');
            const grip=sources.map((s,i)=>({x:Number(plan.turn[i?'handoffReceiverGripX':'handoffGiverGripX']??(i===0?(sign>0?15:85):(sign>0?85:15)))/100,
                y:Number(plan.turn[i?'handoffReceiverGripY':'handoffGiverGripY']??68)/100}));
            if(grip.some(g=>!Number.isFinite(g.x)||!Number.isFinite(g.y)||g.x<0||g.x>1||g.y<0||g.y>1))throw Error('Grip coordinates must be between 0% and 100%.');
            const center={x:(shoulders[0].x+shoulders[1].x)/2,y:(shoulders[0].y+shoulders[1].y)/2+unit*.48};
            const desks=this.app.objects.objects.filter(o=>o.visible!==false&&(data.stagingProps?.[o.id]?.role==='desk'||o.id===plan.turn.handoffDeskId||o.sceneAsset?.activityRole==='desk'));
            const averageGripY=(grip[0].y+grip[1].y)/2;
            const overlappingDesks=desks.filter(d=>d.x<center.x+width/2&&d.x+d.width>center.x-width/2);
            const clearance=Math.min(Infinity,...overlappingDesks.map(d=>d.y-height*(1-averageGripY)-Math.max(6,unit*.04)));
            center.y=Math.min(center.y,clearance);
            const targets=grip.map(g=>({x:center.x+width*(g.x-.5),y:center.y+height*(g.y-(grip[0].y+grip[1].y)/2)}));
            if(!Number.isFinite(unit)||unit<10||targets.some((p,i)=>Math.hypot(p.x-shoulders[i].x,p.y-shoulders[i].y)>lengths[i]*.92))throw Error('The hands cannot reach each other. Move the characters closer, at similar heights, then update the conversation.');
            const held=shoulders.map((p,i)=>({x:p.x+(i===0?sign:-sign)*lengths[i]*.25,y:p.y+lengths[i]*.72}));
            if(overlappingDesks.length)held.forEach((p,i)=>{p.y=Math.min(p.y,center.y+height*(grip[i].y-averageGripY));});
            if(plan.continuation)held[0]=idle[0];
            const resting=plan.resting||idle;
            const prop=new StageObject('image',{name:`Handoff: ${custom?.name||item.name}`,width,height,x:0,y:0,strokeWidth:0,layer:sources[0].obj.layer,
                imageSrc:custom?.src||'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(item.svg),sceneAsset:{...SceneDesign.metadata(item.id),
                    conversationHandoff:{groupId:data.groupId,from:plan.giver.rootId,to:plan.receiver.rootId,transferMs:start+duration*.5},activityRole:'handoff'}});
            const tracks=new Map(),originals=new Map(sources.map(s=>[s.obj.id,copy(s.obj.toJSON())]));
            const frames=sources.map(()=>[]),propFrames=[];
            const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
            const blend=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
            let maxContactError=0;
            try{
                for(let n=0;n<=96;n++){
                    const t=n/96,reach=smooth((t-.12)/.3),release=smooth((t-.58)/.32);
                    const desired=[blend(blend(held[0],targets[0],reach),resting[0],release),blend(blend(idle[1],targets[1],reach),held[1],release)];
                    for(const [i,source] of sources.entries()){
                        system._solveArmatureContactIK(source,desired[i].x,desired[i].y,96,{keepElbowDown:true,wristLimit:18,shoulderLimit:135,elbowLimit:155});
                        if(t>=.42&&t<=.58)for(let pass=0;pass<4;pass++){
                            const p=point(source);if(Math.hypot(p.x-desired[i].x,p.y-desired[i].y)<.5)break;
                            system._solveArmatureContactIK(source,desired[i].x,desired[i].y,96,{keepElbowDown:true,wristLimit:18,shoulderLimit:135,elbowLimit:155});
                        }
                        const actual=point(source),error=Math.hypot(actual.x-desired[i].x,actual.y-desired[i].y);
                        if(t>=.42&&t<=.58)maxContactError=Math.max(maxContactError,error);
                        if(!Number.isFinite(error)||error>Math.max(5,unit*.04))throw Error(`The handoff could not establish a natural hand contact (${plan.actors[i].name}, sample ${n}, error ${error.toFixed(1)} px). Adjust character spacing or reset the arm pose.`);
                        const joints=[...source.obj.joints].sort((a,b)=>a.position-b.position);
                        const values=Object.fromEntries(joints.map((joint,index)=>[`jointAngle_${index}`,joint.angle||0]));
                        frames[i].push({t:(start+t*duration)/total,values});
                    }
                    // Switch ownership only while both hands hold the prop. The visible
                    // trajectory is sampled from the solved hands, not a free-floating path.
                    const owner=t<.5?0:1,p=point(sources[owner]);
                    propFrames.push({t:(start+t*duration)/total,values:{x:p.x-width*grip[owner].x,y:p.y-height*grip[owner].y,opacity:1,visible:true}});
                }
            }finally{system._restoreArmatureActionSnapshot(snapshot,true);}
            const track=keyframes=>{
                if(keyframes[0].t>0)keyframes.unshift({t:0,values:{...keyframes[0].values}});
                if(keyframes.at(-1).t<1)keyframes.push({t:1,values:{...keyframes.at(-1).values}});
                return {id:Utils.generateId('anim'),name:'Handoff hand contacts',type:'continuous',delay:0,repeat:'1',trigger:'onLoad',afterPlayback:'keep',params:{duration:total/1000},
                    generated:{type:'continuous',duration:total,segmentEasing:'linear',properties:Object.keys(keyframes[0].values),keyframes}};
            };
            sources.forEach((s,i)=>tracks.set(s.obj.id,[track(frames[i])]));
            tracks.set(prop.id,[track(propFrames)]);
            Object.assign(prop,propFrames[0].values);originals.set(prop.id,copy(prop.toJSON()));
            return {name:`${plan.giver.name} hands ${item.name} to ${plan.receiver.name}`,durationMs:total,tracks,originals,additions:[prop],
                validation:{maxContactError,transferMs:start+duration*.5,participants:plan.actors.map(a=>a.rootId),grips:grip}};
        }
        async handoffChain(data, plan, prepared, sceneEnd) {
            const exchanges=plan.exchanges.map(p=>({...p,item:prepared.find(item=>item.turn.id===p.turn.id&&item.action?.handoff)}));
            if(exchanges.some(p=>!p.item))return null;
            if(exchanges.some((p,i)=>i&&p.item.actionStart<exchanges[i-1].item.actionStart+exchanges[i-1].seconds*1000))throw Error('Handoffs must follow ownership order without overlapping.');
            const chainEnd=Math.max(sceneEnd,...exchanges.map(p=>p.item.actionStart+p.seconds*1000+1));
            const system=this.app.jointSystem,snapshot=system._armatureActionSnapshot(this.manager.rigFor(plan.giver.rootId));
            const resting=new Map(),tracks=new Map(),originals=new Map();let result=null,previous=null;
            const hands=[],resolved=[];
            try{
                for(const [index,p]of exchanges.entries()){
                    const turn=copy(p.turn);
                    if(index){
                        if((turn.handoffGiverHand||'front-hand')!==(previous.turn.handoffReceiverHand||'front-hand'))throw Error('Pass the prop onward using the same hand that received it.');
                        for(const key of ['handoffProp','handoffArtwork','handoffScale'])turn[key]=exchanges[0].turn[key];
                        turn.handoffGiverGripX=previous.grips[1].x*100;turn.handoffGiverGripY=previous.grips[1].y*100;
                    }
                    const sources=p.actors.map((a,i)=>this.handoffHand(this.manager.rigFor(a.rootId),turn[i?'handoffReceiverHand':'handoffGiverHand']||'front-hand'));
                    for(const source of sources){
                        if(!source)throw Error('This character has no compatible hand.');
                        if(!resting.has(source.obj.id))resting.set(source.obj.id,system._getArmatureEndEffectorWorldPosition(source));
                        if(!hands.includes(source.obj.id))hands.push(source.obj.id);
                    }
                    const clip=await this.handoffClip(data,{...p,turn,continuation:index>0,dimensions:result?.additions[0],resting:sources.map(s=>resting.get(s.obj.id))},p.item.actionStart,chainEnd);
                    if(!result){result=clip;result.additions[0].sceneAsset.conversationHandoff.transfers=[];}
                    const prop=result.additions[0],newProp=clip.additions[0];
                    prop.sceneAsset.conversationHandoff.transfers.push({from:p.giver.rootId,to:p.receiver.rootId,timeMs:clip.validation.transferMs,
                        giverHand:turn.handoffGiverHand||'front-hand',receiverHand:turn.handoffReceiverHand||'front-hand',grips:clip.validation.grips});
                    for(const [id,animations]of clip.tracks){
                        const target=id===newProp.id?prop.id:id,animation=animations[0],start=p.item.actionStart/clip.durationMs,end=(p.item.actionStart+p.seconds*1000)/clip.durationMs;
                        const frames=animation.generated.keyframes.filter(f=>f.t>=start-1e-9&&f.t<=end+1e-9).map(copy);
                        if(!tracks.has(target)){
                            const first=copy(animation);first.generated.keyframes=[{t:0,values:copy(animation.generated.keyframes[0].values)}];tracks.set(target,[first]);
                            originals.set(target,copy(clip.originals.get(id)));
                        }
                        const output=tracks.get(target)[0].generated.keyframes;
                        if(output.at(-1).t===frames[0].t)output.pop();
                        output.push(...frames);
                        if(target!==prop.id){
                            const obj=this.app.objects.getObjectById(target),joints=[...obj.joints].sort((a,b)=>a.position-b.position);
                            for(const [key,value]of Object.entries(frames.at(-1).values)){const match=key.match(/^jointAngle_(\d+)$/);if(match&&joints[Number(match[1])])joints[Number(match[1])].angle=value;}
                        }
                    }
                    this.app.objects._resolvePins();previous={turn,grips:clip.validation.grips};resolved.push({original:p.turn,turn});
                }
                for(const [id,animations]of tracks){
                    const frames=animations[0].generated.keyframes;if(frames.at(-1).t<1)frames.push({t:1,values:copy(frames.at(-1).values)});
                }
                originals.get(result.additions[0].id).sceneAsset=copy(result.additions[0].sceneAsset);
                for(const {original,turn}of resolved)Object.assign(original,turn);
                return {...result,tracks,originals,handIds:hands};
            }finally{system._restoreArmatureActionSnapshot(snapshot,true);}
        }
        async lineAction(data, actor, turn, speechMs) {
            const action=turn.action||'none';
            if(action==='none')return null;
            if(action==='handoff')return {handoff:true,position:turn.actionTiming||'after',durationMs:Number(turn.actionSeconds??3)*1000};
            if(!['wave','raise-hand','explain','nod','turn-front','turn-left','turn-right'].includes(action))throw Error('Choose a supported dialogue action.');
            const position=turn.actionTiming||'before';
            if(!['before','during','after'].includes(position))throw Error('Choose before, during or after speech.');
            const seconds=Number(turn.actionSeconds??2);
            if(!Number.isFinite(seconds)||seconds<.6||seconds>8)throw Error('Dialogue actions need 0.6 to 8 seconds.');
            if(actor.staging.activity!=='none'||actor.staging.ambientMovement!=='idle')throw Error(`${actor.name}: use Conversation activity and no background walk for a line action.`);
            const system=this.app.jointSystem,rig=this.manager.rigFor(actor.rootId),recipe=system._newCharacterSequence(rig);
            const duration=position==='during'?Math.min(seconds,speechMs/1000):seconds;
            if(duration<.2)throw Error('This audio is too short for a dialogue action.');
            if(action.startsWith('turn-')){
                if(position==='during')throw Error('Place body turns before or after speech.');
                const target=action==='turn-front'?'front':action==='turn-left'?'side:left':'side:right';
                recipe.steps=[target,recipe.view].map(view=>({...system._newCharacterSequenceStep('turn'),target:view,duration:duration/2,
                    transition:0,smoothBodyTurn:true,turnTiming:'quick',turnSeconds:duration/2,turnPosture:actor.staging.posture==='seated'?'seated':'idle'}));
            }else{
                const movements=system._getActiveArmatureMovementCatalog(rig);
                const patterns={wave:/^wave(-|$)/,'raise-hand':/^(limb-choice-)?raise-hand(-|$)/,explain:/^(present-explain|gesture.*explain)/,nod:/^(head-nod|nod)(-|$)/};
                const key=Object.keys(movements).find(key=>patterns[action].test(key)&&system._armatureMovementMatchesCurrentView(rig,{...movements[key],key}));
                if(!key)throw Error(`${action} is unavailable for ${actor.name}'s current view.`);
                recipe.steps=[{...system._newCharacterSequenceStep('movement'),key,duration,transition:0,upperBody:action!=='nod'}];
            }
            let clip;
            try{clip=await system._compileCharacterSequence(rig,recipe);}
            catch(error){throw Error(`${actor.name}: ${action}: ${error.message}`);}
            return {clip,position,durationMs:clip.durationMs};
        }
        pauseActivity(clip, windows, rig) {
            if(!windows.length)return;
            const interpolate=(frames,t,key)=>this.app.animations._interpolateCodeValueKeyframes(frames.map(f=>({t:f.t,value:f.values[key]})),t);
            const arms=new Set(Object.entries(rig.parts||{}).filter(([key])=>/arm|hand/.test(key)).map(([,part])=>part.obj?.id));
            const props=new Set(clip.additions.filter(obj=>!['chair','desk','table'].includes(obj.sceneAsset?.activityRole)).map(obj=>obj.id));
            for(const [objectId,tracks] of clip.tracks)for(const track of tracks){
                if(!arms.has(objectId)&&!props.has(objectId))continue;
                const g=track.generated;
                if(!g?.keyframes?.length||!Array.isArray(g.properties))continue;
                const keys=g.properties.filter(key=>!['opacity','visible'].includes(key)&&g.keyframes.every(f=>typeof f.values?.[key]==='number'));
                if(!keys.length)continue;
                const frames=copy(g.keyframes),duration=g.duration||clip.durationMs,delay=Number(track.delay)||0;
                const times=new Set(frames.map(f=>f.t));
                for(const w of windows)for(const t of [w.start-300,w.start,w.end,w.end+300])if(t>=delay&&t<=delay+duration)times.add((t-delay)/duration);
                // Sample the fade so the hand and its prop settle together before speech.
                for(let t=0;t<=duration;t+=40)times.add(t/duration);
                g.keyframes=[...times].sort((a,b)=>a-b).map(t=>{
                    const ms=delay+t*duration;
                    const weight=Math.max(0,...windows.map(w=>ms<w.start?1-(w.start-ms)/300:ms>w.end?1-(ms-w.end)/300:1));
                    const smooth=Math.min(1,weight);const blend=smooth*smooth*(3-2*smooth);
                    const base=frames.findLast(f=>f.t<=t)||frames[0],values={...base.values};
                    for(const key of keys){const current=interpolate(frames,t,key),rest=interpolate(frames,Math.min(1,5/duration),key);values[key]=current+(rest-current)*blend;}
                    return {t,values};
                });
                g.segmentEasing='linear';
            }
        }
        async compile(rig, kind, key, seconds, kit = false, poseOverride = null, cycles = null) {
            const system = this.app.jointSystem;
            const keys = [...system._armatureEditableControlKeys(), '_currentArmature', '_armatureSelectedAction'];
            const saved = new Map(keys.map(k => [k, system[k]]));
            const settings = system._activityKitSettings(rig.root.id), oldSettings = copy(settings);
            const catalogMethod = system._getActiveArmaturePoseCatalog;
            const ownCatalog = Object.hasOwn(system, '_getActiveArmaturePoseCatalog');
            try {
                if (poseOverride) system._getActiveArmaturePoseCatalog = function(...args) {
                    return { ...catalogMethod.apply(this, args), [key]: poseOverride };
                };
                system._currentArmature = rig;
                const catalog = kind === 'pose' ? system._getActiveArmaturePoseCatalog(rig) : system._getActiveArmatureMovementCatalog(rig);
                if (!catalog[key]) throw new Error(`This view does not support ${key}.`);
                system._armatureSelectedAction = { rootId: rig.root.id, kind, key, name: catalog[key].name,
                    view: system._getUniversalCharacterCurrentViewSwitchKey(rig) };
                system._armatureActionDuration = seconds;
                system._armatureActionCycles = kind === 'movement'
                    ? (cycles || Math.min(32, Math.max(1, Math.ceil(seconds * 1000 / catalog[key].duration)))) : 1;
                system._armaturePoseTransition = .001;
                system._armaturePoseHold = Math.max(.1, seconds - .001);
                system._armatureSpeed = 1;
                system._armatureEndFacingKey = 'none';
                system._armatureFinishPoseKey = '';
                system._armatureFinishExpressionKey = '';
                system._armatureFinishGazeKey = '';
                Object.assign(settings, { enabled: kit, furniture: kit, keep: true, prop: '', mode: 'auto', emoji: '', existing: '', chair: '', desk: '' });
                const clip = await system._compileArmatureActionDraft();
                if (!clip) throw new Error(`Could not prepare ${catalog[key].name}.`);
                return clip;
            } finally {
                for (const [key, value] of saved) system[key] = value;
                if (ownCatalog) system._getActiveArmaturePoseCatalog = catalogMethod;
                else delete system._getActiveArmaturePoseCatalog;
                Object.assign(settings, oldSettings);
            }
        }
        async listeningGesture(data, actor, start, duration) {
            const rig = this.manager.rigFor(actor.rootId);
            if (!rig) return;
            const system = this.app.jointSystem;
            const moves = system._getActiveArmatureMovementCatalog(rig);
            const key = ['greet', 'wave'].find(candidate => moves[candidate]
                && system._armatureMovementMatchesCurrentView(rig, { ...moves[candidate], key: candidate }));
            if (!key) return;
            const seconds = Math.max(1.4, Math.min(4, duration / 1000));
            const clip = await this.compile(rig, 'movement', key, seconds);
            this.install(data, clip, start, `${actor.name} raises a hand`);
        }
        install(data, clip, start, name) {
            const installed = this.app.jointSystem._installArmatureAction(clip, start, Utils.generateId('conversation-action'));
            for (const entry of installed) {
                const track = this.app.objects.getObjectById(entry.objectId).animations.find(a => a.id === entry.id);
                track._conversationId = data.groupId; track._conversationStaging = true;
                track.name = `${name}: ${track.name}`;
            }
            data.activityPropIds.push(...clip.additions.map(o => o.id));
            this.app.objects._resolvePins();
            for (const obj of clip.additions) {
                const actor = data.cast.find(a => a.rootId === obj.sceneAsset?.activityRootId);
                this.ownProp(data, this.app.objects.getObjectById(obj.id), actor?.id, obj.sceneAsset?.activityRole);
            }
        }
        groundClip(rig, clip, ground) {
            const system = this.app.jointSystem, engine = this.app.animations;
            const snapshot = system._armatureActionSnapshot(rig);
            const frames = [];
            try {
                this.app.objects.objects.forEach(o => { o.animations = copy(clip.tracks.get(o.id) || []); });
                engine.originalStates = new Map(this.app.objects.objects.map(o => [o.id, copy(o.toJSON())]));
                const steps = Math.max(60, Math.ceil(clip.durationMs / 30));
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    engine.applyAnimationsAtTime(t * clip.durationMs, { timelinePreview: true, finalPose: false });
                    const foot = system._crossViewAnchor(rig);
                    frames.push({ t, values: { y: rig.root.y + ground - foot.y } });
                }
            } finally { system._restoreArmatureActionSnapshot(snapshot, true); }
            const correction = { id: Utils.generateId('anim'), type: 'continuous', name: 'Grounded conversation action',
                delay: 0, repeat: '1', trigger: 'onLoad', afterPlayback: 'keep', params: { duration: clip.durationMs / 1000 },
                generated: { type: 'continuous', duration: clip.durationMs, properties: ['y'], keyframes: frames, segmentEasing: 'linear' } };
            clip.tracks.set(rig.root.id, [...(clip.tracks.get(rig.root.id) || []), correction]);
        }
        async timeline(data, end) {
            this.removeProps(data, 'activityPropIds');
            const system = this.app.jointSystem;
            for (const actor of data.cast) {
                const s = actor.staging;
                if (!s) continue;
                const rig = this.manager.rigFor(actor.rootId);
                if (s.activity !== 'none') {
                    const moves = system._getActiveArmatureMovementCatalog(rig);
                    const keys = s.activity === 'write' ? ['write-side-seated', 'write-seated', 'write-seated-back']
                        : s.activity === 'type' ? ['type-side-seated', 'type-seated', 'type-seated-back']
                        : s.activity === 'eat' ? ['eat-side', 'eat-seated-back', 'eat-loop', 'eat'] : [];
                    const move = keys.find(key => moves[key] && system._armatureMovementMatchesCurrentView(rig, { ...moves[key], key }));
                    const baseline=system._armatureActionSnapshot(rig);
                    let clip;
                    try {
                        // Seated activities include their own hip descent. Compile from
                        // a grounded idle baseline rather than applying that descent twice.
                        if(s.posture==='seated'){
                            system._resetArmatureToActiveCatalogIdle(rig);
                            const foot=system._crossViewAnchor(rig);
                            system._setArmatureRootPosition(rig,rig.root.x,rig.root.y+this.app.stage.height*s.ground-foot.y);
                            system._captureArmatureStageBasePosition(rig);
                        }
                        clip = await this.compile(rig, move ? 'movement' : 'pose', move || this.poseKey(rig, actor),
                            Math.max(1, end / 1000), true, move ? null : this.pose(rig, actor));
                    } finally { system._restoreArmatureActionSnapshot(baseline,true); }
                    // Independently edited or locked kit pieces keep their geometry and tracks.
                    clip.additions = clip.additions.filter(obj => {
                        if (!this.retainedProp(data, actor.id, obj.sceneAsset?.activityRole)) return true;
                        clip.tracks.delete(obj.id); clip.originals.delete(obj.id); return false;
                    });
                    for (const objectId of clip.tracks.keys()) {
                        const obj = this.app.objects.getObjectById(objectId);
                        if (obj && this.protectedProp(data, obj)) { clip.tracks.delete(objectId); clip.originals.delete(objectId); }
                    }
                    if (s.seat === 'none') clip.additions = clip.additions.filter(obj => {
                        if (obj.sceneAsset?.activityRole !== 'chair') return true;
                        clip.tracks.delete(obj.id); clip.originals.delete(obj.id); return false;
                    });
                    if (s.seat === 'bench') for (const obj of clip.additions) {
                        if (obj.sceneAsset?.activityRole !== 'chair') continue;
                        const artworks = obj.sceneAsset.activityArtworks;
                        if (artworks) Object.keys(artworks).forEach(view => {
                            artworks[view] = system._activityChairArtwork(obj.width, obj.height, rig.root.height * .64, view, true);
                        });
                    }
                    // A fitted activity chair replaces the plain staging chair.
                    const generatedChair = clip.additions.some(o => o.sceneAsset?.activityRole === 'chair');
                    if (generatedChair) {
                        const chairId = actor.stagingChairId;
                        const chair = this.app.objects.getObjectById(chairId);
                        if (chair && !this.protectedProp(data, chair)) {
                            this.app.objects.objects = this.app.objects.objects.filter(o => o.id !== chairId);
                            data.furnitureIds = data.furnitureIds.filter(id => id !== chairId);
                            delete data.stagingProps?.[chairId];
                        }
                    }
                    if(s.pauseForSpeech!==false&&move)this.pauseActivity(clip,data.turns.filter(t=>t.speaker===actor.id&&t.audioId&&t.durationMs>0).map(t=>({start:t.startMs,end:t.startMs+t.durationMs})),rig);
                    this.install(data, clip, 0, actor.name);
                }
                if (s.ambientMovement !== 'idle') {
                    const moves = system._getActiveArmatureMovementCatalog(rig);
                    const key = ['walk-natural-cycle', 'walk-cycle', 'walk'].find(candidate => moves[candidate]
                        && system._armatureMovementMatchesCurrentView(rig, { ...moves[candidate], key: candidate }));
                    if (!key) throw new Error(`No walking cycle is available for ${actor.name}'s view.`);
                    const seconds = Math.max(8, Math.min(120, end / 1000));
                    const clip = await this.compile(rig, 'movement', key, seconds);
                    const from = rig.root.x;
                    const direction = s.ambientMovement === 'walk-left' ? -1 : 1;
                    const travelDistance = this.app.stage.width * .18;
                    const travel = { id: Utils.generateId('anim'), type: 'continuous', name: 'Group walk path',
                        trigger: 'onLoad', repeat: '1', delay: 0, afterPlayback: 'keep', params: { duration: seconds },
                        generated: { type: 'continuous', duration: seconds * 1000, properties: ['x'], segmentEasing: 'easeInOutSine',
                            keyframes: [{ t: 0, values: { x: from } }, { t: 1, values: { x: from + direction * travelDistance } }] } };
                    clip.tracks.set(rig.root.id, [...(clip.tracks.get(rig.root.id) || []), travel]);
                    this.install(data, clip, 0, `${actor.name} walking`);
                }
                if(s.closingTurn && s.closingTurn!=='none'){
                    const recipe=system._newCharacterSequence(rig);
                    recipe.steps=[{...system._newCharacterSequenceStep('turn'),target:s.closingTurn,duration:.55,
                        transition:0,smoothBodyTurn:true,turnTiming:'quick',turnSeconds:.55,turnPosture:s.posture==='seated'?'seated':'idle'}];
                    const clip=await system._compileCharacterSequence(rig,recipe);
                    this.install(data,clip,end+300,`${actor.name} closing turn`);
                }
                if (s.entrance === 'none' && s.exit === 'none') continue;
                const snapshot = system._armatureActionSnapshot(rig);
                const ground = system._crossViewAnchor(rig).y;
                const clips = [];
                try {
                    const catalog = system._getActiveArmaturePoseCatalog(rig);
                    const seated = this.poseKey(rig, actor);
                    const idle = ['idle', 'stand', 'neutral'].find(key => catalog[key]);
                    const poseTransition = async (key, start, name) => {
                        const clip = await this.compile(rig, 'pose', key, 1.8);
                        // The native pose recorder supplies the view-specific grounded endpoints.
                        clip.tracks.forEach(tracks => tracks.forEach(track => {
                            const generated = track.generated;
                            if (generated?.keyframes?.length > 1) {
                                generated.keyframes = [{ t: 0, values: generated.keyframes[0].values },
                                    { t: 1, values: generated.keyframes[generated.keyframes.length - 1].values }];
                                generated.segmentEasing = 'easeInOutQuad';
                            }
                        }));
                        this.groundClip(rig, clip, ground);
                        clips.push([clip, start, name]);
                        system._applyArmaturePose(rig, catalog[key], false);
                    };
                    const walk = async (start, arriving) => {
                        const standing = system._resetArmatureToActiveCatalogIdle(rig) || rig;
                        const clip = await this.compile(standing, 'movement', 'walk-natural-cycle', s.actionSeconds);
                        const distance = this.app.stage.width * s.distance / 100 * (s.view.endsWith('left') ? -1 : 1);
                        const x = rig.root.x, from = arriving ? x - distance : x, to = arriving ? x : x + distance;
                        const travel = { id: Utils.generateId('anim'), type: 'continuous', name: arriving ? 'Approach' : 'Leave',
                            trigger: 'onLoad', repeat: '1', delay: 0, afterPlayback: 'keep', params: { duration: s.actionSeconds },
                            generated: { type: 'continuous', duration: s.actionSeconds * 1000, properties: ['x'], segmentEasing: 'easeInOutQuad',
                                keyframes: [{ t: 0, values: { x: from } }, { t: 1, values: { x: to } }] } };
                        clip.tracks.set(rig.root.id, [...(clip.tracks.get(rig.root.id) || []), travel]);
                        this.groundClip(rig, clip, ground);
                        clips.push([clip, start, arriving ? 'Enter' : 'Exit']);
                    };
                    if (s.entrance !== 'none') {
                        system._resetArmatureToActiveCatalogIdle(rig);
                        if (s.entrance.includes('walk')) await walk(0, true);
                        if (s.entrance.includes('sit')) await poseTransition(seated, s.entrance.includes('walk') ? s.actionSeconds * 1000 : 0, 'Sit');
                    }
                    // Restore the conversation pose before constructing the departure.
                    system._restoreArmatureActionSnapshot(snapshot, true);
                    if (s.exit.includes('stand')) await poseTransition(idle, end + 300, 'Stand');
                    if (s.exit.includes('walk')) await walk(end + 300 + (s.exit.includes('stand') ? 1800 : 0), false);
                } finally { system._restoreArmatureActionSnapshot(snapshot, true); }
                for (const [clip, start, name] of clips) this.install(data, clip, start, `${actor.name} ${name}`);
                this.manager.assertScene(this.manager.current());
            }
        }
    }
    window.ConversationStaging = ConversationStaging;
})();
