/* ============================================
   SmartArt Templates Library
   Defines all SmartArt layouts as composable
   stage-object specifications
   ============================================ */

class SmartArtTemplates {
    constructor() {
        this.categories = this.buildCategories();
        this.templates = this.buildAllTemplates();
        this._templateSearchIndex = new Map();
    }

    static TEMPLATE_SYNONYMS = {
        'basic-block-list': ['block list', 'bullet points', 'item list'],
        'horizontal-bullet-list': ['horizontal list', 'bullet list'],
        'vertical-chevron-list': ['vertical chevron', 'stacked chevrons'],
        'stacked-list': ['numbered list', 'stack list'],
        'accent-list': ['accent bar', 'highlight list'],
        'basic-process': ['workflow', 'steps', 'process flow', 'pipeline'],
        flowchart: ['flowchart', 'flow chart', 'decision flow', 'process map'],
        'chevron-process': ['chevron', 'arrow process'],
        'step-down-process': ['stair step', 'descending process'],
        'timeline-process': ['timeline', 'event timeline'],
        'funnel-process': ['funnel'],
        'alternating-flow': ['zigzag flow', 'snake flow'],
        'basic-cycle': ['cycle', 'loop', 'repeat'],
        'segmented-cycle': ['segmented ring', 'ring cycle'],
        'gear-cycle': ['gear', 'cog', 'interlock'],
        'org-chart': ['org chart', 'organization chart', 'organization'],
        'horizontal-hierarchy': ['hierarchy', 'tree', 'branching'],
        'basic-venn': ['venn'],
        'basic-target': ['target', 'bullseye'],
        radial: ['hub and spoke', 'hub', 'spoke', 'radial'],
        'opposing-ideas': ['compare', 'comparison', 'vs', 'versus', 'opposing'],
        equation: ['equation', 'formula'],
        'basic-matrix': ['matrix', 'quadrant', '2x2'],
        'swot-matrix': ['swot'],
        'basic-pyramid': ['pyramid'],
        'inverted-pyramid': ['inverted pyramid'],
        'picture-grid': ['picture', 'photo grid', 'image grid', 'gallery'],
        'picture-strip': ['picture strip', 'image strip'],
        'milestone-timeline': ['milestone'],
        'radial-progress': ['progress ring', 'completion ring'],
        'progress-bars': ['progress bar'],
        'step-counter': ['step counter', 'numbered steps'],
        'stats-dashboard': ['stats', 'dashboard', 'kpi', 'metrics'],
        'comparison-infographic': ['side by side', 'comparison infographic'],
        checklist: ['checklist', 'todo', 'to do'],
        roadmap: ['roadmap', 'release plan'],
        'bar-chart': ['bar chart', 'column chart'],
        'horizontal-bar-chart': ['horizontal bar chart', 'horizontal bars'],
        'donut-chart': ['donut', 'doughnut', 'pie chart', 'ring chart'],
        'heat-map': ['heat map', 'heatmap'],
        treemap: ['tree map'],
        'bubble-chart': ['bubble chart'],
        'business-model-canvas': ['business model canvas', 'bmc', 'lean canvas'],
        'pestle-analysis': ['pestle', 'pest', 'macro environment'],
        'porters-five': ['porter', 'five forces', 'competitive forces'],
        'okr-framework': ['okr', 'objectives and key results'],
        'pdca-cycle': ['pdca', 'plan do check act', 'deming'],
        'service-blueprint': ['service blueprint', 'service map', 'journey operations', 'frontstage backstage'],
        'value-chain': ['value chain', 'supply chain'],
        'marketing-funnel': ['marketing funnel', 'conversion funnel', 'sales funnel'],
        'customer-journey': ['customer journey', 'journey map', 'experience map'],
        'persona-card': ['persona', 'buyer persona', 'user profile'],
        'four-ps': ['4p', '4 ps', 'marketing mix'],
        'competitor-analysis': ['competitor analysis', 'competitive analysis', 'benchmarking'],
        'sales-pipeline': ['sales pipeline', 'deal pipeline', 'opportunity pipeline'],
        'concept-map': ['concept map', 'mind map', 'knowledge map'],
        'flash-cards': ['flash cards', 'study cards', 'quiz cards'],
        'learning-path': ['learning path', 'curriculum', 'course outline'],
        'grading-rubric': ['rubric', 'grading', 'assessment criteria'],
        'vocabulary-builder': ['vocabulary', 'glossary', 'word builder'],
        'fishbone-diagram': ['fishbone', 'ishikawa', 'cause and effect'],
        'kanban-board': ['kanban', 'task board', 'agile board'],
        'gantt-chart': ['gantt', 'schedule', 'project timeline', 'project plan'],
        'swimlane-process': ['swimlane', 'cross functional', 'lane process'],
        'raci-matrix': ['raci', 'responsible accountable consulted informed'],
        'risk-matrix': ['risk matrix', 'risk assessment', 'risk register'],
        'stakeholder-map': ['stakeholder map', 'stakeholder analysis', 'influence map'],
        'decision-tree': ['decision tree', 'if then', 'decision flow'],
        wbs: ['work breakdown', 'task decomposition'],
        'user-flow': ['user flow', 'ux flow', 'screen flow', 'wireflow'],
        'api-architecture': ['api', 'rest api', 'microservice', 'endpoint'],
        'devops-pipeline': ['devops', 'ci cd', 'deployment pipeline', 'build pipeline'],
        'cloud-architecture': ['cloud', 'aws', 'azure', 'gcp', 'infrastructure'],
        'database-schema': ['database', 'schema', 'erd', 'entity relationship'],
        'budget-planner': ['budget', 'expense plan', 'spending'],
        'pnl-statement': ['p&l', 'p l', 'profit loss', 'income statement'],
        'investment-portfolio': ['investment', 'portfolio', 'asset allocation'],
        'cost-benefit': ['cost benefit', 'roi analysis', 'cba'],
        'financial-ratios': ['financial ratios', 'liquidity', 'solvency', 'profitability ratio']
    };

    buildCategories() {
        return [
            { id: 'list', name: 'List', icon: 'fa-list' },
            { id: 'process', name: 'Process', icon: 'fa-arrow-right' },
            { id: 'cycle', name: 'Cycle', icon: 'fa-sync-alt' },
            { id: 'hierarchy', name: 'Hierarchy', icon: 'fa-sitemap' },
            { id: 'relationship', name: 'Relationship', icon: 'fa-project-diagram' },
            { id: 'matrix', name: 'Matrix', icon: 'fa-th' },
            { id: 'pyramid', name: 'Pyramid', icon: 'fa-sort-amount-up' },
            { id: 'picture', name: 'Picture', icon: 'fa-images' },
            { id: 'infographic', name: 'Infographic', icon: 'fa-chart-line' },
            { id: 'dataviz', name: 'Data Viz', icon: 'fa-chart-bar' },
            { id: 'strategy', name: 'Strategy', icon: 'fa-chess' },
            { id: 'marketing', name: 'Marketing', icon: 'fa-bullhorn' },
            { id: 'education', name: 'Education', icon: 'fa-graduation-cap' },
            { id: 'project', name: 'Project', icon: 'fa-tasks' },
            { id: 'technology', name: 'Technology', icon: 'fa-microchip' },
            { id: 'finance', name: 'Finance', icon: 'fa-coins' }
        ];
    }

    /* ============================
       Master Template Registry
       Each template returns an object with:
         id, name, category, description,
         minItems, maxItems, defaultItems,
         generate(items, palette, stageW, stageH) => { objects[], connections[] }
       items = [{text, subtext?, imageSrc?}, ...]
       palette = { colors[], bg, text, connector }
       generate returns arrays of StageObject-compatible prop dicts
       ============================ */

    buildAllTemplates() {
        const t = [];

        // ======= LIST =======
        t.push({
            id: 'basic-block-list', name: 'Basic Block List', category: 'list',
            description: 'Vertical blocks with text',
            minItems: 2, maxItems: 10, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genBasicBlockList(items, pal, sw, sh)
        });
        t.push({
            id: 'horizontal-bullet-list', name: 'Horizontal Bullet List', category: 'list',
            description: 'Horizontal row of labelled boxes',
            minItems: 2, maxItems: 8, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genHorizontalBulletList(items, pal, sw, sh)
        });
        t.push({
            id: 'vertical-chevron-list', name: 'Vertical Chevron List', category: 'list',
            description: 'Stacked chevrons with labels',
            minItems: 2, maxItems: 8, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genVerticalChevronList(items, pal, sw, sh)
        });
        t.push({
            id: 'stacked-list', name: 'Stacked List', category: 'list',
            description: 'Numbered stacked rectangles',
            minItems: 2, maxItems: 8, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genStackedList(items, pal, sw, sh)
        });
        t.push({
            id: 'accent-list', name: 'Accent Bar List', category: 'list',
            description: 'List items with colored accent bars',
            minItems: 2, maxItems: 8, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genAccentList(items, pal, sw, sh)
        });

        // ======= PROCESS =======
        t.push({
            id: 'basic-process', name: 'Basic Process', category: 'process',
            description: 'Horizontal boxes connected by arrows',
            minItems: 2, maxItems: 8, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genBasicProcess(items, pal, sw, sh)
        });
        t.push({
            id: 'flowchart', name: 'Flowchart', category: 'process',
            description: 'Flowchart path with action and decision nodes',
            minItems: 3, maxItems: 7, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genFlowchart(items, pal, sw, sh)
        });
        t.push({
            id: 'chevron-process', name: 'Chevron Process', category: 'process',
            description: 'Horizontal chevron arrows',
            minItems: 2, maxItems: 7, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genChevronProcess(items, pal, sw, sh)
        });
        t.push({
            id: 'step-down-process', name: 'Step-Down Process', category: 'process',
            description: 'Descending staircase of steps',
            minItems: 2, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genStepDownProcess(items, pal, sw, sh)
        });
        t.push({
            id: 'timeline-process', name: 'Timeline', category: 'process',
            description: 'Horizontal timeline with events',
            minItems: 2, maxItems: 8, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genTimelineProcess(items, pal, sw, sh)
        });
        t.push({
            id: 'funnel-process', name: 'Funnel', category: 'process',
            description: 'Narrowing funnel stages',
            minItems: 2, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genFunnelProcess(items, pal, sw, sh)
        });
        t.push({
            id: 'alternating-flow', name: 'Alternating Flow', category: 'process',
            description: 'Zigzag flow with alternating sides',
            minItems: 2, maxItems: 8, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genAlternatingFlow(items, pal, sw, sh)
        });

        // ======= CYCLE =======
        t.push({
            id: 'basic-cycle', name: 'Basic Cycle', category: 'cycle',
            description: 'Circular arrangement with arrows',
            minItems: 3, maxItems: 8, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genBasicCycle(items, pal, sw, sh)
        });
        t.push({
            id: 'segmented-cycle', name: 'Segmented Cycle', category: 'cycle',
            description: 'Pie-like segmented ring',
            minItems: 3, maxItems: 8, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genSegmentedCycle(items, pal, sw, sh)
        });
        t.push({
            id: 'gear-cycle', name: 'Gear Cycle', category: 'cycle',
            description: 'Interlocking gears representing processes',
            minItems: 2, maxItems: 4, defaultItems: 3,
            generate: (items, pal, sw, sh) => this._genGearCycle(items, pal, sw, sh)
        });

        // ======= HIERARCHY =======
        t.push({
            id: 'org-chart', name: 'Organization Chart', category: 'hierarchy',
            description: 'Classic top-down org chart',
            minItems: 3, maxItems: 30, defaultItems: 7,
            generate: (items, pal, sw, sh) => this._genOrgChart(items, pal, sw, sh)
        });
        t.push({
            id: 'horizontal-hierarchy', name: 'Horizontal Hierarchy', category: 'hierarchy',
            description: 'Left-to-right branching tree',
            minItems: 3, maxItems: 24, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genHorizontalHierarchy(items, pal, sw, sh)
        });

        // ======= RELATIONSHIP =======
        t.push({
            id: 'basic-venn', name: 'Venn Diagram', category: 'relationship',
            description: 'Overlapping circles showing relationships',
            minItems: 2, maxItems: 4, defaultItems: 3,
            generate: (items, pal, sw, sh) => this._genBasicVenn(items, pal, sw, sh)
        });
        t.push({
            id: 'basic-target', name: 'Target Diagram', category: 'relationship',
            description: 'Concentric rings target',
            minItems: 2, maxItems: 5, defaultItems: 3,
            generate: (items, pal, sw, sh) => this._genTargetDiagram(items, pal, sw, sh)
        });
        t.push({
            id: 'radial', name: 'Radial Diagram', category: 'relationship',
            description: 'Center hub with radiating nodes',
            minItems: 3, maxItems: 8, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genRadialDiagram(items, pal, sw, sh)
        });
        t.push({
            id: 'opposing-ideas', name: 'Opposing Ideas', category: 'relationship',
            description: 'Two sides facing each other',
            minItems: 2, maxItems: 2, defaultItems: 2,
            generate: (items, pal, sw, sh) => this._genOpposingIdeas(items, pal, sw, sh)
        });
        t.push({
            id: 'equation', name: 'Equation', category: 'relationship',
            description: 'A + B = C layout',
            minItems: 3, maxItems: 5, defaultItems: 3,
            generate: (items, pal, sw, sh) => this._genEquation(items, pal, sw, sh)
        });

        // ======= MATRIX =======
        t.push({
            id: 'basic-matrix', name: 'Basic Matrix', category: 'matrix',
            description: '2x2 quadrant grid',
            minItems: 4, maxItems: 4, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genBasicMatrix(items, pal, sw, sh)
        });
        t.push({
            id: 'swot-matrix', name: 'SWOT Matrix', category: 'matrix',
            description: 'Strengths, Weaknesses, Opportunities, Threats',
            minItems: 4, maxItems: 4, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genSWOTMatrix(items, pal, sw, sh)
        });

        // ======= PYRAMID =======
        t.push({
            id: 'basic-pyramid', name: 'Basic Pyramid', category: 'pyramid',
            description: 'Stacked pyramid layers, narrow at top',
            minItems: 3, maxItems: 7, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genBasicPyramid(items, pal, sw, sh)
        });
        t.push({
            id: 'inverted-pyramid', name: 'Inverted Pyramid', category: 'pyramid',
            description: 'Wide at top, narrow at bottom',
            minItems: 3, maxItems: 7, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genInvertedPyramid(items, pal, sw, sh)
        });

        // ======= PICTURE =======
        t.push({
            id: 'picture-grid', name: 'Picture Grid', category: 'picture',
            description: 'Grid of captioned image placeholders',
            minItems: 2, maxItems: 9, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genPictureGrid(items, pal, sw, sh)
        });
        t.push({
            id: 'picture-strip', name: 'Picture Strip', category: 'picture',
            description: 'Horizontal row of image cards',
            minItems: 2, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genPictureStrip(items, pal, sw, sh)
        });

        // ======= ADDITIONAL LIST TEMPLATES =======
        t.push({
            id: 'grouped-list', name: 'Grouped List', category: 'list',
            description: 'Numbered headers with text bodies',
            minItems: 2, maxItems: 8, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genGroupedList(items, pal, sw, sh)
        });
        t.push({
            id: 'table-list', name: 'Table List', category: 'list',
            description: 'Table-style alternating rows',
            minItems: 2, maxItems: 10, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genTableList(items, pal, sw, sh)
        });
        t.push({
            id: 'lined-list', name: 'Lined List', category: 'list',
            description: 'Minimal list with dot accents',
            minItems: 2, maxItems: 8, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genLinedList(items, pal, sw, sh)
        });

        // ======= ADDITIONAL PROCESS TEMPLATES =======
        t.push({
            id: 'circular-process', name: 'Circular Process', category: 'process',
            description: 'Steps arranged in a circular flow',
            minItems: 3, maxItems: 8, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genCircularProcess(items, pal, sw, sh)
        });
        t.push({
            id: 'ascending-blocks', name: 'Ascending Blocks', category: 'process',
            description: 'Progressively taller blocks',
            minItems: 3, maxItems: 7, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genAscendingBlocks(items, pal, sw, sh)
        });
        t.push({
            id: 'phased-process', name: 'Phased Process', category: 'process',
            description: 'Numbered phases with description cards',
            minItems: 2, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genPhasedProcess(items, pal, sw, sh)
        });

        // ======= ADDITIONAL CYCLE TEMPLATES =======
        t.push({
            id: 'continuous-cycle', name: 'Continuous Cycle', category: 'cycle',
            description: 'Rounded pill nodes in a ring',
            minItems: 3, maxItems: 8, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genContinuousCycle(items, pal, sw, sh)
        });
        t.push({
            id: 'block-cycle', name: 'Block Cycle', category: 'cycle',
            description: 'Square blocks in circular arrangement',
            minItems: 3, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genBlockCycle(items, pal, sw, sh)
        });
        t.push({
            id: 'text-cycle', name: 'Text Cycle', category: 'cycle',
            description: 'Minimal text labels on a ring',
            minItems: 3, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genTextCycle(items, pal, sw, sh)
        });

        // ======= ADDITIONAL HIERARCHY TEMPLATES =======
        t.push({
            id: 'labeled-hierarchy', name: 'Labeled Hierarchy', category: 'hierarchy',
            description: 'Hierarchy with level labels',
            minItems: 3, maxItems: 30, defaultItems: 6,
            generate: (items, pal, sw, sh) => this._genLabeledHierarchy(items, pal, sw, sh)
        });
        t.push({
            id: 'tree-chart', name: 'Tree Chart', category: 'hierarchy',
            description: 'Classic spreading tree structure',
            minItems: 3, maxItems: 30, defaultItems: 7,
            generate: (items, pal, sw, sh) => this._genTreeChart(items, pal, sw, sh)
        });
        t.push({
            id: 'half-circle-org', name: 'Half Circle Org', category: 'hierarchy',
            description: 'Semi-circular organization layout',
            minItems: 3, maxItems: 9, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genHalfCircleOrg(items, pal, sw, sh)
        });

        // ======= ADDITIONAL RELATIONSHIP TEMPLATES =======
        t.push({
            id: 'balance', name: 'Balance', category: 'relationship',
            description: 'Scale/balance comparison diagram',
            minItems: 2, maxItems: 2, defaultItems: 2,
            generate: (items, pal, sw, sh) => this._genBalance(items, pal, sw, sh)
        });
        t.push({
            id: 'nested', name: 'Nested', category: 'relationship',
            description: 'Nested containment boxes',
            minItems: 2, maxItems: 5, defaultItems: 3,
            generate: (items, pal, sw, sh) => this._genNested(items, pal, sw, sh)
        });

        // ======= ADDITIONAL MATRIX TEMPLATES =======
        t.push({
            id: 'grid-matrix', name: 'Grid Matrix', category: 'matrix',
            description: '3\u00d73 detailed grid layout',
            minItems: 9, maxItems: 9, defaultItems: 9,
            generate: (items, pal, sw, sh) => this._genGridMatrix(items, pal, sw, sh)
        });
        t.push({
            id: 'titled-matrix', name: 'Titled Matrix', category: 'matrix',
            description: 'Matrix with row and column headers',
            minItems: 4, maxItems: 4, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genTitledMatrix(items, pal, sw, sh)
        });

        // ======= ADDITIONAL PYRAMID TEMPLATES =======
        t.push({
            id: 'segmented-pyramid', name: 'Segmented Pyramid', category: 'pyramid',
            description: 'Pyramid with visible segments',
            minItems: 3, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genSegmentedPyramid(items, pal, sw, sh)
        });
        t.push({
            id: 'step-pyramid', name: 'Step Pyramid', category: 'pyramid',
            description: '3D stepped pyramid effect',
            minItems: 3, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genStepPyramid(items, pal, sw, sh)
        });

        // ======= ADDITIONAL PICTURE TEMPLATES =======
        t.push({
            id: 'picture-accent-list', name: 'Picture Accent List', category: 'picture',
            description: 'Images with text descriptions beside them',
            minItems: 2, maxItems: 6, defaultItems: 3,
            generate: (items, pal, sw, sh) => this._genPictureAccentList(items, pal, sw, sh)
        });
        t.push({
            id: 'picture-lineup', name: 'Picture Lineup', category: 'picture',
            description: 'Portrait-style card lineup',
            minItems: 2, maxItems: 5, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genPictureLineup(items, pal, sw, sh)
        });
        t.push({
            id: 'picture-showcase', name: 'Picture Showcase', category: 'picture',
            description: 'One large image with small thumbnails',
            minItems: 3, maxItems: 7, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genPictureShowcase(items, pal, sw, sh)
        });

        // ======= INFOGRAPHICS =======
        t.push({
            id: 'milestone-timeline', name: 'Milestone Timeline', category: 'infographic',
            description: 'Horizontal timeline with milestone markers',
            minItems: 2, maxItems: 8, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genMilestoneTimeline(items, pal, sw, sh)
        });
        t.push({
            id: 'radial-progress', name: 'Radial Progress', category: 'infographic',
            description: 'Circular progress indicators with labels',
            minItems: 2, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genRadialProgress(items, pal, sw, sh)
        });
        t.push({
            id: 'progress-bars', name: 'Progress Bars', category: 'infographic',
            description: 'Horizontal progress bars with percentages',
            minItems: 2, maxItems: 8, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genProgressBars(items, pal, sw, sh)
        });
        t.push({
            id: 'step-counter', name: 'Step Counter', category: 'infographic',
            description: 'Numbered step indicators in a row',
            minItems: 3, maxItems: 7, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genStepCounter(items, pal, sw, sh)
        });
        t.push({
            id: 'stats-dashboard', name: 'Stats Dashboard', category: 'infographic',
            description: 'Big number statistics cards',
            minItems: 2, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genStatsDashboard(items, pal, sw, sh)
        });
        t.push({
            id: 'comparison-infographic', name: 'Comparison', category: 'infographic',
            description: 'Side-by-side comparison layout',
            minItems: 2, maxItems: 2, defaultItems: 2,
            generate: (items, pal, sw, sh) => this._genComparisonInfographic(items, pal, sw, sh)
        });
        t.push({
            id: 'checklist', name: 'Checklist', category: 'infographic',
            description: 'Visual checklist with status icons',
            minItems: 3, maxItems: 8, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genChecklist(items, pal, sw, sh)
        });
        t.push({
            id: 'roadmap', name: 'Roadmap', category: 'infographic',
            description: 'Winding path roadmap with milestones',
            minItems: 3, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genRoadmap(items, pal, sw, sh)
        });

        // ======= DATA VISUALIZATION =======
        t.push({
            id: 'bar-chart', name: 'Bar Chart', category: 'dataviz',
            description: 'Vertical bar chart with values',
            minItems: 2, maxItems: 24, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genBarChart(items, pal, sw, sh)
        });
        t.push({
            id: 'horizontal-bar-chart', name: 'Horizontal Bars', category: 'dataviz',
            description: 'Horizontal bar chart layout',
            minItems: 2, maxItems: 24, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genHorizontalBarChart(items, pal, sw, sh)
        });
        t.push({
            id: 'donut-chart', name: 'Donut Chart', category: 'dataviz',
            description: 'Ring chart with center label',
            minItems: 2, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genDonutChart(items, pal, sw, sh)
        });
        t.push({
            id: 'heat-map', name: 'Heat Map', category: 'dataviz',
            description: 'Color intensity grid',
            minItems: 9, maxItems: 9, defaultItems: 9,
            generate: (items, pal, sw, sh) => this._genHeatMap(items, pal, sw, sh)
        });
        t.push({
            id: 'treemap', name: 'Treemap', category: 'dataviz',
            description: 'Proportional area rectangles',
            minItems: 3, maxItems: 8, defaultItems: 6,
            generate: (items, pal, sw, sh) => this._genTreemap(items, pal, sw, sh)
        });
        t.push({
            id: 'bubble-chart', name: 'Bubble Chart', category: 'dataviz',
            description: 'Sized circles representing data',
            minItems: 3, maxItems: 8, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genBubbleChart(items, pal, sw, sh)
        });
        t.push({
            id: 'clustered-bar-chart', name: 'Clustered Bars', category: 'dataviz',
            description: 'Grouped bars per item — comma-separated values',
            minItems: 2, maxItems: 16, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genClusteredBarChart(items, pal, sw, sh)
        });
        t.push({
            id: 'stacked-bar-chart', name: 'Stacked Bars', category: 'dataviz',
            description: 'Stacked segments per item — comma-separated values',
            minItems: 2, maxItems: 16, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genStackedBarChart(items, pal, sw, sh)
        });
        t.push({
            id: 'line-chart', name: 'Line Chart', category: 'dataviz',
            description: 'Single line with markers',
            minItems: 2, maxItems: 24, defaultItems: 6,
            generate: (items, pal, sw, sh) => this._genLineChart(items, pal, sw, sh)
        });
        t.push({
            id: 'multi-line-chart', name: 'Multi-line Chart', category: 'dataviz',
            description: 'Multiple lines — comma-separated values per item',
            minItems: 2, maxItems: 24, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genMultiLineChart(items, pal, sw, sh)
        });
        t.push({
            id: 'combo-chart', name: 'Combo Chart (Bar + Line)', category: 'dataviz',
            description: 'Bars (primary) + line (secondary) on dual axes',
            minItems: 2, maxItems: 20, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genComboChart(items, pal, sw, sh)
        });

        // ======= BUSINESS STRATEGY =======
        t.push({
            id: 'business-model-canvas', name: 'Business Model Canvas', category: 'strategy',
            description: '9-block canvas for business modeling',
            minItems: 9, maxItems: 9, defaultItems: 9,
            generate: (items, pal, sw, sh) => this._genBusinessModelCanvas(items, pal, sw, sh)
        });
        t.push({
            id: 'pestle-analysis', name: 'PESTLE Analysis', category: 'strategy',
            description: 'Political, Economic, Social, Tech, Legal, Environmental',
            minItems: 6, maxItems: 6, defaultItems: 6,
            generate: (items, pal, sw, sh) => this._genPestleAnalysis(items, pal, sw, sh)
        });
        t.push({
            id: 'porters-five', name: "Porter's Five Forces", category: 'strategy',
            description: 'Competitive forces analysis diagram',
            minItems: 5, maxItems: 5, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genPortersFive(items, pal, sw, sh)
        });
        t.push({
            id: 'okr-framework', name: 'OKR Framework', category: 'strategy',
            description: 'Objectives and Key Results layout',
            minItems: 3, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genOKRFramework(items, pal, sw, sh)
        });
        t.push({
            id: 'pdca-cycle', name: 'PDCA Cycle', category: 'strategy',
            description: 'Plan-Do-Check-Act improvement cycle',
            minItems: 4, maxItems: 4, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genPDCACycle(items, pal, sw, sh)
        });
        t.push({
            id: 'service-blueprint', name: 'Service Blueprint', category: 'strategy',
            description: 'Customer, touchpoint, and backstage service lanes',
            minItems: 3, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genServiceBlueprint(items, pal, sw, sh)
        });
        t.push({
            id: 'value-chain', name: 'Value Chain', category: 'strategy',
            description: 'Primary and support activities chain',
            minItems: 4, maxItems: 8, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genValueChain(items, pal, sw, sh)
        });

        // ======= MARKETING & SALES =======
        t.push({
            id: 'marketing-funnel', name: 'Marketing Funnel', category: 'marketing',
            description: 'AIDA awareness to action funnel',
            minItems: 3, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genMarketingFunnel(items, pal, sw, sh)
        });
        t.push({
            id: 'customer-journey', name: 'Customer Journey', category: 'marketing',
            description: 'Journey map from awareness to loyalty',
            minItems: 3, maxItems: 7, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genCustomerJourney(items, pal, sw, sh)
        });
        t.push({
            id: 'persona-card', name: 'Persona Card', category: 'marketing',
            description: 'User persona profile card layout',
            minItems: 4, maxItems: 6, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genPersonaCard(items, pal, sw, sh)
        });
        t.push({
            id: 'four-ps', name: '4Ps Marketing Mix', category: 'marketing',
            description: 'Product, Price, Place, Promotion',
            minItems: 4, maxItems: 4, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genFourPs(items, pal, sw, sh)
        });
        t.push({
            id: 'competitor-analysis', name: 'Competitor Analysis', category: 'marketing',
            description: 'Side-by-side competitor comparison grid',
            minItems: 3, maxItems: 5, defaultItems: 3,
            generate: (items, pal, sw, sh) => this._genCompetitorAnalysis(items, pal, sw, sh)
        });
        t.push({
            id: 'sales-pipeline', name: 'Sales Pipeline', category: 'marketing',
            description: 'Sales stages pipeline visualization',
            minItems: 3, maxItems: 7, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genSalesPipeline(items, pal, sw, sh)
        });

        // ======= EDUCATIONAL =======
        t.push({
            id: 'concept-map', name: 'Concept Map', category: 'education',
            description: 'Central topic with branching concepts',
            minItems: 3, maxItems: 7, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genConceptMap(items, pal, sw, sh)
        });
        t.push({
            id: 'flash-cards', name: 'Flash Cards', category: 'education',
            description: 'Set of study flash cards',
            minItems: 2, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genFlashCards(items, pal, sw, sh)
        });
        t.push({
            id: 'learning-path', name: 'Learning Path', category: 'education',
            description: 'Progressive learning journey steps',
            minItems: 3, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genLearningPath(items, pal, sw, sh)
        });
        t.push({
            id: 'grading-rubric', name: 'Grading Rubric', category: 'education',
            description: 'Assessment criteria grid',
            minItems: 3, maxItems: 5, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genGradingRubric(items, pal, sw, sh)
        });
        t.push({
            id: 'vocabulary-builder', name: 'Vocabulary Builder', category: 'education',
            description: 'Word-definition card layout',
            minItems: 3, maxItems: 8, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genVocabularyBuilder(items, pal, sw, sh)
        });
        t.push({
            id: 'fishbone-diagram', name: 'Fishbone Diagram', category: 'education',
            description: 'Cause and effect diagram with branching factors',
            minItems: 4, maxItems: 8, defaultItems: 6,
            generate: (items, pal, sw, sh) => this._genFishboneDiagram(items, pal, sw, sh)
        });

        // ======= PROJECT MANAGEMENT =======
        t.push({
            id: 'kanban-board', name: 'Kanban Board', category: 'project',
            description: 'To Do / In Progress / Done board',
            minItems: 3, maxItems: 5, defaultItems: 3,
            generate: (items, pal, sw, sh) => this._genKanbanBoard(items, pal, sw, sh)
        });
        t.push({
            id: 'gantt-chart', name: 'Gantt Chart', category: 'project',
            // Allow more rows so a typical task list / case timeline (8-20 rows) fits.
            description: 'Simplified project timeline bars',
            minItems: 3, maxItems: 24, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genGanttChart(items, pal, sw, sh)
        });
        t.push({
            id: 'swimlane-process', name: 'Swimlane Process', category: 'project',
            description: 'Cross-functional process grouped by owner lanes',
            minItems: 3, maxItems: 8, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genSwimlaneProcess(items, pal, sw, sh)
        });
        t.push({
            id: 'raci-matrix', name: 'RACI Matrix', category: 'project',
            description: 'Responsible/Accountable/Consulted/Informed',
            minItems: 4, maxItems: 4, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genRACIMatrix(items, pal, sw, sh)
        });
        t.push({
            id: 'risk-matrix', name: 'Risk Matrix', category: 'project',
            description: 'Likelihood vs Impact risk grid',
            minItems: 4, maxItems: 4, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genRiskMatrix(items, pal, sw, sh)
        });
        t.push({
            id: 'stakeholder-map', name: 'Stakeholder Map', category: 'project',
            description: 'Power vs Interest stakeholder quadrant',
            minItems: 4, maxItems: 4, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genStakeholderMap(items, pal, sw, sh)
        });
        t.push({
            id: 'decision-tree', name: 'Decision Tree', category: 'project',
            description: 'Binary decision branching diagram',
            minItems: 3, maxItems: 7, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genDecisionTree(items, pal, sw, sh)
        });
        t.push({
            id: 'wbs', name: 'Work Breakdown', category: 'project',
            description: 'Work breakdown structure chart',
            minItems: 3, maxItems: 30, defaultItems: 7,
            generate: (items, pal, sw, sh) => this._genWBS(items, pal, sw, sh)
        });

        // ======= TECHNOLOGY =======
        t.push({
            id: 'user-flow', name: 'User Flow', category: 'technology',
            description: 'User interaction flow diagram',
            minItems: 3, maxItems: 7, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genUserFlow(items, pal, sw, sh)
        });
        t.push({
            id: 'api-architecture', name: 'API Architecture', category: 'technology',
            description: 'Client-server API layer diagram',
            minItems: 3, maxItems: 5, defaultItems: 3,
            generate: (items, pal, sw, sh) => this._genAPIArchitecture(items, pal, sw, sh)
        });
        t.push({
            id: 'devops-pipeline', name: 'DevOps Pipeline', category: 'technology',
            description: 'CI/CD pipeline stages',
            minItems: 3, maxItems: 7, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genDevOpsPipeline(items, pal, sw, sh)
        });
        t.push({
            id: 'cloud-architecture', name: 'Cloud Architecture', category: 'technology',
            description: 'Cloud services layer diagram',
            minItems: 3, maxItems: 5, defaultItems: 3,
            generate: (items, pal, sw, sh) => this._genCloudArchitecture(items, pal, sw, sh)
        });
        t.push({
            id: 'database-schema', name: 'Database Schema', category: 'technology',
            description: 'Table/entity relationship diagram',
            minItems: 3, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genDatabaseSchema(items, pal, sw, sh)
        });

        // ======= FINANCE =======
        t.push({
            id: 'budget-planner', name: 'Budget Planner', category: 'finance',
            description: 'Budget allocation breakdown',
            minItems: 3, maxItems: 8, defaultItems: 5,
            generate: (items, pal, sw, sh) => this._genBudgetPlanner(items, pal, sw, sh)
        });
        t.push({
            id: 'pnl-statement', name: 'P&L Statement', category: 'finance',
            description: 'Profit and loss overview',
            minItems: 4, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genPnLStatement(items, pal, sw, sh)
        });
        t.push({
            id: 'investment-portfolio', name: 'Investment Portfolio', category: 'finance',
            description: 'Portfolio allocation visualization',
            minItems: 3, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genInvestmentPortfolio(items, pal, sw, sh)
        });
        t.push({
            id: 'cost-benefit', name: 'Cost-Benefit Matrix', category: 'finance',
            description: 'Cost vs benefit analysis grid',
            minItems: 4, maxItems: 4, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genCostBenefit(items, pal, sw, sh)
        });
        t.push({
            id: 'financial-ratios', name: 'Financial Ratios', category: 'finance',
            description: 'Key financial metrics cards',
            minItems: 3, maxItems: 6, defaultItems: 4,
            generate: (items, pal, sw, sh) => this._genFinancialRatios(items, pal, sw, sh)
        });

        return t;
    }

    getTemplate(id) {
        return this.templates.find(t => t.id === id);
    }

    getByCategory(catId) {
        return this.templates.filter(t => t.category === catId);
    }

    _normalizeSearchText(text) {
        return String(text || '')
            .toLowerCase()
            .replace(/&/g, ' and ')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    _tokenizeSearchText(text) {
        return this._normalizeSearchText(text)
            .split(/\s+/)
            .filter(token => token.length > 1);
    }

    _getTemplateAliases(templateId) {
        return SmartArtTemplates.TEMPLATE_SYNONYMS[templateId] || [];
    }

    _getTemplateSearchEntry(template) {
        if (!template) return null;
        if (!this._templateSearchIndex.has(template.id)) {
            const aliases = this._getTemplateAliases(template.id);
            const parts = [
                template.name,
                template.description,
                template.category,
                template.id.replace(/-/g, ' '),
                ...aliases
            ];
            const normalizedParts = parts
                .map(part => this._normalizeSearchText(part))
                .filter(Boolean);
            this._templateSearchIndex.set(template.id, {
                template,
                aliases,
                blob: normalizedParts.join(' '),
                tokens: new Set(normalizedParts.flatMap(part => part.split(/\s+/)).filter(Boolean))
            });
        }
        return this._templateSearchIndex.get(template.id);
    }

    searchTemplates(categoryId = 'all', query = '') {
        const list = categoryId === 'all' ? this.templates : this.getByCategory(categoryId);
        const normalizedQuery = this._normalizeSearchText(query);
        if (!normalizedQuery) return list;

        const queryTokens = this._tokenizeSearchText(normalizedQuery);
        return list
            .map((template) => ({ template, score: this._scoreTemplateMatch(template, normalizedQuery, queryTokens) }))
            .filter(entry => entry.score > 0)
            .sort((left, right) => right.score - left.score || left.template.name.localeCompare(right.template.name))
            .map(entry => entry.template);
    }

    _scoreTemplateMatch(template, normalizedQuery, queryTokens = this._tokenizeSearchText(normalizedQuery)) {
        const entry = this._getTemplateSearchEntry(template);
        if (!entry || !normalizedQuery) return 0;

        let score = 0;
        if (entry.blob.includes(normalizedQuery)) score += 12;

        const normalizedName = this._normalizeSearchText(template.name);
        const normalizedId = this._normalizeSearchText(template.id.replace(/-/g, ' '));
        if (normalizedName === normalizedQuery) score += 18;
        if (normalizedId === normalizedQuery) score += 16;
        if (entry.aliases.some(alias => this._normalizeSearchText(alias) === normalizedQuery)) score += 22;

        let tokenHits = 0;
        queryTokens.forEach((token) => {
            if (entry.tokens.has(token)) {
                tokenHits += 1;
                score += 3;
            } else if (entry.blob.includes(token)) {
                tokenHits += 1;
                score += 2;
            }
        });

        if (queryTokens.length && tokenHits === queryTokens.length) score += 8;
        return score;
    }

    findBestTemplateMatch(query) {
        const normalizedQuery = this._normalizeSearchText(query);
        if (!normalizedQuery) return null;
        const queryTokens = this._tokenizeSearchText(normalizedQuery);
        const ranked = this.templates
            .map(template => ({ template, score: this._scoreTemplateMatch(template, normalizedQuery, queryTokens) }))
            .filter(entry => entry.score > 0)
            .sort((left, right) => right.score - left.score || left.template.name.localeCompare(right.template.name));
        if (!ranked.length || ranked[0].score < 6) return null;
        return ranked[0].template;
    }

    /* ==================================================================
       Color palettes — users can pick, AI can suggest
       ================================================================== */
    static PALETTES = {
        corporate: { colors: ['#4472C4','#ED7D31','#A5A5A5','#FFC000','#5B9BD5','#70AD47','#264478','#9B57A0'], bg: '#ffffff', text: '#ffffff', connector: '#888888' },
        ocean:     { colors: ['#0B5394','#3D85C6','#6FA8DC','#9FC5E8','#CFE2F3','#073763','#134f87','#1a6dad'], bg: '#ffffff', text: '#ffffff', connector: '#6FA8DC' },
        sunset:    { colors: ['#E74C3C','#E67E22','#F1C40F','#E74C3C','#D35400','#C0392B','#F39C12','#E74C3C'], bg: '#ffffff', text: '#ffffff', connector: '#E67E22' },
        forest:    { colors: ['#27AE60','#2ECC71','#1ABC9C','#16A085','#229954','#1E8449','#148F77','#117A65'], bg: '#ffffff', text: '#ffffff', connector: '#27AE60' },
        modern:    { colors: ['#6366F1','#818CF8','#A78BFA','#C084FC','#E879F9','#F472B6','#FB7185','#F87171'], bg: '#ffffff', text: '#ffffff', connector: '#818CF8' },
        monochrome:{ colors: ['#2c3e50','#445566','#5d6d7e','#778899','#95a5a6','#aab7b8','#bfc9ca','#d5dbdb'], bg: '#ffffff', text: '#ffffff', connector: '#778899' },
        pastel:    { colors: ['#AEC6CF','#FFD1DC','#FDFD96','#B2F2BB','#D8B4FE','#FDE68A','#BFDBFE','#FCA5A5'], bg: '#ffffff', text: '#333333', connector: '#aaa' },
        dark:      { colors: ['#6366F1','#22C55E','#F59E0B','#EF4444','#06B6D4','#A855F7','#EC4899','#14B8A6'], bg: '#1a1a2e', text: '#eaeaf2', connector: '#555' },
        berry:     { colors: ['#8B5CF6','#A855F7','#D946EF','#EC4899','#F43F5E','#C026D3','#9333EA','#7C3AED'], bg: '#ffffff', text: '#ffffff', connector: '#A855F7' },
        earth:     { colors: ['#92400E','#B45309','#D97706','#CA8A04','#65A30D','#15803D','#0D9488','#0E7490'], bg: '#ffffff', text: '#ffffff', connector: '#B45309' },
        neon:      { colors: ['#00FF87','#60EFFF','#FF1B6B','#FFD600','#8B5CF6','#FF6B35','#00D4FF','#FF3CAC'], bg: '#0f0f23', text: '#ffffff', connector: '#60EFFF' },
        candy:     { colors: ['#FF6B6B','#FFA07A','#FFD93D','#6BCB77','#4D96FF','#9B59B6','#FF85B3','#74C0FC'], bg: '#ffffff', text: '#ffffff', connector: '#FF6B6B' },
        arctic:    { colors: ['#E0F2FE','#BAE6FD','#7DD3FC','#38BDF8','#0EA5E9','#0284C7','#0369A1','#075985'], bg: '#F0F9FF', text: '#1e3a5f', connector: '#38BDF8' },
        midnight:  { colors: ['#312E81','#3730A3','#4338CA','#4F46E5','#6366F1','#818CF8','#A5B4FC','#C7D2FE'], bg: '#1E1B4B', text: '#E0E7FF', connector: '#6366F1' }
    };

    getDefaultPalette() { return SmartArtTemplates.PALETTES.corporate; }

    /* ==================================================================
       Default items generators — provide sample text
       ================================================================== */
    getDefaultItems(templateId) {
        const tpl = this.getTemplate(templateId);
        if (!tpl) return [];
        const n = tpl.defaultItems;
        if (templateId === 'swimlane-process') {
            const texts = ['Discover needs', 'Draft scope', 'Design flow', 'Build assets', 'Launch handoff'];
            const lanes = this.getDefaultSecondaryValues(templateId, n);
            return Array.from({ length: n }, (_, i) => ({
                text: texts[i] || `Task ${i + 1}`,
                subtext: lanes[i] || 'Team'
            }));
        }
        if (templateId === 'fishbone-diagram') {
            const causes = ['People', 'Process', 'Tools', 'Data', 'Policy', 'Environment', 'Timing', 'Training'];
            return Array.from({ length: n }, (_, i) => ({
                text: causes[i] || `Cause ${i + 1}`,
                subtext: ''
            }));
        }
        if (templateId === 'service-blueprint') {
            const customerActions = ['Discover offer', 'Book service', 'Use service', 'Resolve issue', 'Renew plan', 'Refer peer'];
            const touchpoints = this.getDefaultSecondaryValues(templateId, n);
            const backstage = this.getDefaultTertiaryValues(templateId, n);
            return Array.from({ length: n }, (_, i) => ({
                text: customerActions[i] || `Customer action ${i + 1}`,
                subtext: touchpoints[i] || 'Visible touchpoint',
                detail: backstage[i] || 'Backstage support'
            }));
        }
        const sampleLabels = ['Item 1','Item 2','Item 3','Item 4','Item 5','Item 6','Item 7','Item 8','Item 9','Item 10'];
        // Category-specific defaults
        const catDefaults = {
            process: ['Research','Plan','Execute','Review','Deploy','Optimize','Test','Launch'],
            cycle: ['Plan','Do','Check','Act','Analyze','Improve','Evaluate','Iterate'],
            hierarchy: ['CEO','VP Marketing','VP Engineering','VP Sales','Manager A','Manager B','Manager C','Lead 1','Lead 2','Analyst'],
            list: ['Overview','Key Points','Details','Summary','Conclusion','Appendix','Notes','References'],
            relationship: ['Concept A','Concept B','Concept C','Concept D','Core','Related'],
            matrix: ['Strengths','Weaknesses','Opportunities','Threats','Analysis','Strategy','Execution','Monitoring','Review'],
            pyramid: ['Foundation','Growth','Standards','Mastery','Vision','Strategy','Execution'],
            picture: ['Photo 1','Photo 2','Photo 3','Photo 4','Photo 5','Photo 6'],
            infographic: ['Milestone 1','Milestone 2','Milestone 3','Milestone 4','Milestone 5','Phase 1','Phase 2','Phase 3'],
            dataviz: ['Sales','Revenue','Costs','Profit','Growth','Marketing','Support','R&D','Operations'],
            strategy: ['Key Partners','Key Activities','Value Props','Customer Rel','Channels','Customer Seg','Key Resources','Cost Structure','Revenue'],
            marketing: ['Awareness','Interest','Desire','Action','Loyalty','Advocacy','Retention'],
            education: ['Introduction','Core Concept','Practice','Assessment','Review','Advanced','Summary','Reflection'],
            project: ['To Do','In Progress','Done','Backlog','Review','Planning','Execution'],
            technology: ['Frontend','Backend','Database','API','Auth','Cache','CDN'],
            finance: ['Revenue','Expenses','Profit','Assets','Liabilities','Equity']
        };
        const pool = catDefaults[tpl.category] || sampleLabels;
        const secondaryDefaults = this.getDefaultSecondaryValues(templateId, n);
        return Array.from({ length: n }, (_, i) => ({
            text: pool[i] || `Item ${i + 1}`,
            subtext: secondaryDefaults[i] || ''
        }));
    }

    getItemEditorConfig(templateId) {
        const configs = {
            'radial-progress': { secondaryLabel: 'Percent', secondaryPlaceholder: 'e.g. 68%' },
            'progress-bars': { secondaryLabel: 'Percent', secondaryPlaceholder: 'e.g. 72%' },
            'bar-chart': { secondaryLabel: 'Value', secondaryPlaceholder: 'e.g. 84' },
            'horizontal-bar-chart': { secondaryLabel: 'Value', secondaryPlaceholder: 'e.g. 61%' },
            'clustered-bar-chart': { secondaryLabel: 'Values', secondaryPlaceholder: 'e.g. 100, 60, 40' },
            'stacked-bar-chart': { secondaryLabel: 'Values', secondaryPlaceholder: 'e.g. 30, 25, 15' },
            'line-chart': { secondaryLabel: 'Value', secondaryPlaceholder: 'e.g. 75' },
            'multi-line-chart': { secondaryLabel: 'Values', secondaryPlaceholder: 'e.g. 80, 65, 50' },
            'combo-chart': { secondaryLabel: 'Bar, Line', secondaryPlaceholder: 'e.g. 120, 4.5' },
            'stats-dashboard': { secondaryLabel: 'Value', secondaryPlaceholder: 'e.g. 247' },
            'budget-planner': { secondaryLabel: 'Percent', secondaryPlaceholder: 'e.g. 25%' },
            'pnl-statement': { secondaryLabel: 'Amount', secondaryPlaceholder: 'e.g. +$12K' },
            'investment-portfolio': { secondaryLabel: 'Percent', secondaryPlaceholder: 'e.g. 35%' },
            'financial-ratios': { secondaryLabel: 'Value', secondaryPlaceholder: 'e.g. 2.4x' },
            'gantt-chart': { secondaryLabel: 'Duration', secondaryPlaceholder: 'e.g. 6 wks' },
            'swimlane-process': { secondaryLabel: 'Lane', secondaryPlaceholder: 'e.g. Design' },
            'service-blueprint': {
                primaryLabel: 'Customer Action',
                primaryPlaceholder: 'e.g. Confirm booking',
                secondaryLabel: 'Touchpoint',
                secondaryPlaceholder: 'e.g. Confirmation email',
                tertiaryLabel: 'Backstage',
                tertiaryPlaceholder: 'e.g. CRM updates and staffing sync'
            }
        };
        return configs[templateId] || null;
    }

    getDefaultSecondaryValues(templateId, count) {
        const defaults = {
            'radial-progress': ['60%', '68%', '76%', '84%', '92%', '95%'],
            'progress-bars': ['40%', '52%', '64%', '76%', '88%', '55%', '67%', '79%'],
            'bar-chart': ['30', '45', '60', '75', '90', '55', '70', '85'],
            'horizontal-bar-chart': ['40%', '53%', '66%', '79%', '92%', '58%', '71%', '84%'],
            'clustered-bar-chart': ['90, 60, 40', '120, 80, 55', '70, 95, 65', '110, 85, 75', '95, 70, 85', '130, 90, 60'],
            'stacked-bar-chart': ['30, 25, 15', '40, 20, 25', '20, 35, 30', '35, 30, 20', '25, 40, 15', '45, 25, 20'],
            'line-chart': ['30', '45', '60', '55', '70', '85', '78', '92'],
            'multi-line-chart': ['60, 40, 30', '70, 55, 45', '85, 65, 50', '80, 70, 60', '95, 75, 65', '90, 85, 70'],
            'combo-chart': ['120, 3.2', '180, 4.1', '150, 3.8', '210, 4.7', '240, 5.0', '200, 4.5'],
            'stats-dashboard': ['247', '494', '741', '988', '1235', '1482'],
            'budget-planner': ['20%', '20%', '20%', '20%', '20%', '15%', '15%', '15%'],
            'pnl-statement': ['+$12K', '-$10K', '+$36K', '-$20K', '+$60K', '-$30K'],
            'investment-portfolio': ['25%', '25%', '25%', '25%', '20%', '15%'],
            'financial-ratios': ['2.4x', '15.3%', '0.85', '$1.2M', '3.1x', '22.7%'],
            'gantt-chart': ['3 wks', '4 wks', '5 wks', '6 wks', '7 wks', '8 wks'],
            'swimlane-process': ['Research', 'Product', 'Design', 'Engineering', 'Marketing', 'Operations'],
            'service-blueprint': ['Landing page', 'Booking flow', 'Onboarding guide', 'Support chat', 'Success review', 'Referral prompt']
        };
        const pool = defaults[templateId] || [];
        return Array.from({ length: count }, (_, i) => pool[i] || '');
    }

    getDefaultTertiaryValues(templateId, count) {
        const defaults = {
            'service-blueprint': [
                'Campaign ops align messaging and audience targeting',
                'Scheduling system reserves capacity and updates calendars',
                'Operations team provisions access and fulfillment steps',
                'Support triages issue context and routes the right specialist',
                'Customer success reviews adoption data and next actions',
                'Lifecycle automation triggers advocacy and referral workflows'
            ]
        };
        const pool = defaults[templateId] || [];
        return Array.from({ length: count }, (_, i) => pool[i] || '');
    }

    _getItemSecondaryValue(item, fallback = '') {
        if (!item) return fallback;
        const raw = item.subtext ?? item.value ?? item.amount;
        if (raw === 0) return '0';
        if (typeof raw === 'string' && raw.trim()) return raw.trim();
        if (raw != null && raw !== '') return String(raw);
        return fallback;
    }

    _getItemNumericValue(item, fallback = null) {
        const raw = this._getItemSecondaryValue(item, '');
        if (!raw) return fallback;
        const match = String(raw).replace(/,/g, '').match(/-?\d*\.?\d+/);
        if (!match) return fallback;
        const value = parseFloat(match[0]);
        return Number.isFinite(value) ? value : fallback;
    }

    _getItemRatio(item, fallback = 0.5) {
        let value = this._getItemNumericValue(item, null);
        if (value == null) return fallback;
        if (Math.abs(value) > 1) value /= 100;
        return Math.max(0, Math.min(1, value));
    }

    _getWeightedRatios(items, fallbackRatios = []) {
        const weights = items.map((item) => {
            const value = this._getItemNumericValue(item, null);
            return value != null && value > 0 ? value : 0;
        });
        const total = weights.reduce((sum, value) => sum + value, 0);
        if (total > 0) {
            return weights.map(value => value / total);
        }
        if (fallbackRatios.length === items.length) {
            return fallbackRatios;
        }
        return Array.from({ length: items.length }, () => 1 / Math.max(1, items.length));
    }

    /* ==================================================================
       GENERATOR IMPLEMENTATIONS
       Each returns { objects[], connections[] }
       objects are StageObject-compatible props
       connections are { fromId, toId, type:'arrow'|'line' }
       ================================================================== */

    // Helper: centered layout region
    _region(sw, sh, padPct = 0.08) {
        const px = sw * padPct, py = sh * padPct;
        return { x: px, y: py, w: sw - px * 2, h: sh - py * 2 };
    }

    // Helper: assign id
    _id() { return 'sa_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2,5); }

    // ---- LIST generators ----

    _genBasicBlockList(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 12;
        const itemH = (r.h - gap * (items.length - 1)) / items.length;
        const objects = [];
        items.forEach((item, i) => {
            const id = this._id();
            objects.push({
                _saId: id, _saRole: 'block', _saIndex: i,
                type: 'rectangle', x: r.x, y: r.y + i * (itemH + gap),
                width: r.w, height: itemH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 8, strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: Math.min(20, itemH * 0.35),
                textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genHorizontalBulletList(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 14;
        const itemW = (r.w - gap * (items.length - 1)) / items.length;
        const objects = [];
        items.forEach((item, i) => {
            const id = this._id();
            objects.push({
                _saId: id, _saRole: 'block', _saIndex: i,
                type: 'rectangle', x: r.x + i * (itemW + gap), y: r.y + r.h * 0.15,
                width: itemW, height: r.h * 0.7,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 10, strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: Math.min(18, itemW * 0.18),
                textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genVerticalChevronList(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 6;
        const itemH = (r.h - gap * (items.length - 1)) / items.length;
        const objects = [];
        items.forEach((item, i) => {
            const id = this._id();
            // Use diamond shape rotated, or just rectangles with arrows
            objects.push({
                _saId: id, _saRole: 'chevron', _saIndex: i,
                type: 'rectangle', x: r.x, y: r.y + i * (itemH + gap),
                width: r.w, height: itemH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 4, strokeWidth: 0,
                text: `▶  ${item.text}`, textColor: pal.text,
                fontSize: Math.min(18, itemH * 0.4), textAlign: 'left', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genStackedList(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 8;
        const itemH = (r.h - gap * (items.length - 1)) / items.length;
        const numW = 50;
        const objects = [];
        items.forEach((item, i) => {
            const yy = r.y + i * (itemH + gap);
            const numId = this._id();
            objects.push({
                _saId: numId, _saRole: 'number', _saIndex: i,
                type: 'circle', x: r.x, y: yy + (itemH - numW) / 2,
                width: numW, height: numW,
                fill: pal.colors[i % pal.colors.length], strokeWidth: 0,
                text: String(i + 1), textColor: pal.text, fontSize: 18,
                textAlign: 'center', fontWeight: '700'
            });
            const blockId = this._id();
            objects.push({
                _saId: blockId, _saRole: 'block', _saIndex: i,
                type: 'rectangle', x: r.x + numW + 12, y: yy,
                width: r.w - numW - 12, height: itemH,
                fill: pal.colors[i % pal.colors.length] + '33',
                borderRadius: 6, strokeWidth: 0,
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : pal.text,
                fontSize: Math.min(16, itemH * 0.38), textAlign: 'left', fontWeight: '500'
            });
        });
        return { objects, connections: [] };
    }

    _genAccentList(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 10;
        const itemH = (r.h - gap * (items.length - 1)) / items.length;
        const barW = 6;
        const objects = [];
        items.forEach((item, i) => {
            const yy = r.y + i * (itemH + gap);
            objects.push({
                _saId: this._id(), _saRole: 'accent', _saIndex: i,
                type: 'rectangle', x: r.x, y: yy,
                width: barW, height: itemH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 2, strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'block', _saIndex: i,
                type: 'rectangle', x: r.x + barW + 8, y: yy,
                width: r.w - barW - 8, height: itemH,
                fill: pal.bg === '#ffffff' ? '#f5f5f5' : '#22223c',
                borderRadius: 6, strokeWidth: 0,
                text: item.text, textColor: pal.text === '#ffffff' ? '#dddddd' : '#333333',
                fontSize: Math.min(16, itemH * 0.35), textAlign: 'left', fontWeight: '500'
            });
        });
        return { objects, connections: [] };
    }

    // ---- PROCESS generators ----

    _genBasicProcess(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const vertical = this._flowDirection === 'vertical';
        const objects = [];
        const connections = [];
        if (vertical) {
            // Stacked boxes connected by downward arrows
            const arrowH = 22;
            const gap = arrowH + 10;
            const boxH = (r.h - gap * (items.length - 1)) / items.length;
            const boxW = Math.min(r.w, r.w * 0.85);
            const xx = r.x + (r.w - boxW) / 2;
            items.forEach((item, i) => {
                const id = this._id();
                const by = r.y + i * (boxH + gap);
                objects.push({
                    _saId: id, _saRole: 'step', _saIndex: i,
                    type: 'rectangle', x: xx, y: by,
                    width: boxW, height: boxH,
                    fill: pal.colors[i % pal.colors.length],
                    borderRadius: 10, strokeWidth: 0,
                    text: item.text, textColor: pal.text,
                    fontSize: Math.min(18, boxH * 0.32),
                    textAlign: 'center', fontWeight: '600'
                });
                if (i < items.length - 1) {
                    objects.push({
                        _saId: this._id(), _saRole: 'arrow', _saIndex: i,
                        type: 'arrow', x: xx + boxW / 2 - 8, y: by + boxH + 5,
                        width: 16, height: arrowH,
                        fill: pal.connector, stroke: pal.connector, strokeWidth: 2,
                        rotation: 90
                    });
                    connections.push({ fromId: id, toId: null, type: 'arrow' });
                }
            });
            return { objects, connections };
        }
        const arrowW = 30;
        const gap = arrowW + 10;
        const boxW = (r.w - gap * (items.length - 1)) / items.length;
        const boxH = r.h * 0.45;
        const yy = r.y + (r.h - boxH) / 2;
        items.forEach((item, i) => {
            const id = this._id();
            const bx = r.x + i * (boxW + gap);
            objects.push({
                _saId: id, _saRole: 'step', _saIndex: i,
                type: 'rectangle', x: bx, y: yy,
                width: boxW, height: boxH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 10, strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: Math.min(18, boxW * 0.16),
                textAlign: 'center', fontWeight: '600'
            });
            if (i < items.length - 1) {
                const aid = this._id();
                objects.push({
                    _saId: aid, _saRole: 'arrow', _saIndex: i,
                    type: 'arrow', x: bx + boxW + 5, y: yy + boxH / 2 - 8,
                    width: arrowW, height: 16,
                    fill: pal.connector, stroke: pal.connector, strokeWidth: 2
                });
                connections.push({ fromId: id, toId: null, type: 'arrow' });
            }
        });
        return { objects, connections };
    }

    _genFlowchart(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const arrowW = 26;
        const gap = arrowW + 12;
        const nodeW = (r.w - gap * (items.length - 1)) / items.length;
        const nodeH = Math.min(r.h * 0.46, nodeW * 0.72);
        const yy = r.y + (r.h - nodeH) / 2;
        const objects = [];

        items.forEach((item, i) => {
            const bx = r.x + i * (nodeW + gap);
            const isDecision = i % 2 === 1 && i < items.length - 1;
            const shapeType = isDecision ? 'diamond' : 'rectangle';
            const shapeH = isDecision ? nodeH * 0.88 : nodeH;
            const shapeY = yy + (nodeH - shapeH) / 2;
            objects.push({
                _saId: this._id(), _saRole: 'flow-node', _saIndex: i,
                type: shapeType, x: bx, y: shapeY,
                width: nodeW, height: shapeH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: shapeType === 'rectangle' ? 12 : 0,
                strokeWidth: 0,
                text: item.text, textColor: pal.text,
                fontSize: Math.min(15, nodeW * 0.12),
                textAlign: 'center', fontWeight: '600'
            });
            if (i < items.length - 1) {
                objects.push({
                    _saId: this._id(), _saRole: 'flow-arrow', _saIndex: i,
                    type: 'arrow', x: bx + nodeW + 6, y: yy + nodeH / 2 - 8,
                    width: arrowW, height: 16,
                    fill: pal.connector, stroke: pal.connector, strokeWidth: 2
                });
            }
        });

        return { objects, connections: [] };
    }

    _genChevronProcess(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const vertical = this._flowDirection === 'vertical';
        const objects = [];
        if (vertical) {
            // Stacked downward chevrons (overlap vertically)
            const overlap = 14;
            const chevW = Math.min(r.w, r.w * 0.72);
            const chevH = (r.h + overlap * (items.length - 1)) / items.length;
            const xx = r.x + (r.w - chevW) / 2;
            items.forEach((item, i) => {
                objects.push({
                    _saId: this._id(), _saRole: 'chevron', _saIndex: i,
                    type: 'diamond', x: xx, y: r.y + i * (chevH - overlap),
                    width: chevW, height: chevH,
                    fill: pal.colors[i % pal.colors.length],
                    strokeWidth: 0,
                    text: item.text, textColor: pal.text,
                    fontSize: Math.min(16, chevH * 0.18),
                    textAlign: 'center', fontWeight: '600'
                });
            });
            return { objects, connections: [] };
        }
        const chevH = r.h * 0.4;
        const overlap = 20;
        const chevW = (r.w + overlap * (items.length - 1)) / items.length;
        const yy = r.y + (r.h - chevH) / 2;
        items.forEach((item, i) => {
            objects.push({
                _saId: this._id(), _saRole: 'chevron', _saIndex: i,
                type: 'diamond', x: r.x + i * (chevW - overlap), y: yy,
                width: chevW, height: chevH,
                fill: pal.colors[i % pal.colors.length],
                strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: Math.min(16, chevW * 0.12),
                textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genStepDownProcess(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const boxW = r.w * 0.35;
        const boxH = r.h / (items.length + 0.5);
        const stepX = (r.w - boxW) / Math.max(1, items.length - 1);
        const stepY = (r.h - boxH) / Math.max(1, items.length - 1);
        const objects = [];
        // Diagonal connector arrows from each box's bottom-right to next box's top-left (drawn first)
        for (let i = 0; i < items.length - 1; i++) {
            const ax = r.x + i * stepX + boxW;
            const ay = r.y + i * stepY + boxH;
            const bx = r.x + (i + 1) * stepX;
            const by = r.y + (i + 1) * stepY;
            objects.push({
                _saId: this._id(), _saRole: 'connector', _saIndex: i,
                type: 'arrow', x: ax - 6, y: ay - 6,
                width: bx - ax + 12, height: by - ay + 12,
                fill: pal.connector, stroke: pal.connector, strokeWidth: 2
            });
        }
        items.forEach((item, i) => {
            objects.push({
                _saId: this._id(), _saRole: 'step', _saIndex: i,
                type: 'rectangle', x: r.x + i * stepX, y: r.y + i * stepY,
                width: boxW, height: boxH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 8, strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: Math.min(16, boxH * 0.35),
                textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genTimelineProcess(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const vertical = this._flowDirection === 'vertical';
        const dotR = 14;
        const objects = [];
        if (vertical) {
            // Vertical timeline: line down the middle, alternating left/right labels
            const lineX = r.x + r.w * 0.5;
            const gap = r.h / items.length;
            objects.push({
                _saId: this._id(), _saRole: 'line', _saIndex: -1,
                type: 'line', x: lineX, y: r.y, width: 0, height: r.h,
                stroke: pal.connector, strokeWidth: 3, fill: 'transparent'
            });
            const labelW = (r.w / 2) - dotR - 16;
            items.forEach((item, i) => {
                const cy = r.y + gap * (i + 0.5);
                objects.push({
                    _saId: this._id(), _saRole: 'dot', _saIndex: i,
                    type: 'circle', x: lineX - dotR, y: cy - dotR,
                    width: dotR * 2, height: dotR * 2,
                    fill: pal.colors[i % pal.colors.length],
                    strokeWidth: 2, stroke: '#ffffff'
                });
                const right = i % 2 === 0;
                const labelH = Math.min(gap - 8, 56);
                const labelX = right ? lineX + dotR + 12 : r.x;
                objects.push({
                    _saId: this._id(), _saRole: 'label', _saIndex: i,
                    type: 'text', x: labelX, y: cy - labelH / 2,
                    width: labelW, height: labelH,
                    text: item.text, textColor: pal.text === '#ffffff' ? '#dddddd' : '#333333',
                    fontSize: Math.min(14, labelW * 0.1),
                    textAlign: right ? 'left' : 'right', fontWeight: '600',
                    fill: 'transparent', strokeWidth: 0
                });
            });
            return { objects, connections: [] };
        }
        const lineY = r.y + r.h * 0.5;
        const gap = r.w / (items.length);
        // Horizontal line
        objects.push({
            _saId: this._id(), _saRole: 'line', _saIndex: -1,
            type: 'line', x: r.x, y: lineY, width: r.w, height: 0,
            stroke: pal.connector, strokeWidth: 3, fill: 'transparent'
        });
        items.forEach((item, i) => {
            const cx = r.x + gap * (i + 0.5);
            // Dot on timeline
            objects.push({
                _saId: this._id(), _saRole: 'dot', _saIndex: i,
                type: 'circle', x: cx - dotR, y: lineY - dotR,
                width: dotR * 2, height: dotR * 2,
                fill: pal.colors[i % pal.colors.length], strokeWidth: 2, stroke: '#ffffff'
            });
            // Label above or below alternating
            const above = i % 2 === 0;
            const labelH = 40;
            const labelW = gap - 10;
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: cx - labelW / 2, y: above ? lineY - dotR - labelH - 16 : lineY + dotR + 16,
                width: labelW, height: labelH,
                text: item.text, textColor: pal.text === '#ffffff' ? '#dddddd' : '#333333',
                fontSize: Math.min(14, labelW * 0.14), textAlign: 'center', fontWeight: '600',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genFunnelProcess(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 6;
        const segH = (r.h - gap * (items.length - 1)) / items.length;
        const objects = [];
        items.forEach((item, i) => {
            const ratio = 1 - (i * 0.12);
            const segW = r.w * Math.max(0.3, ratio);
            const xOff = (r.w - segW) / 2;
            objects.push({
                _saId: this._id(), _saRole: 'funnel', _saIndex: i,
                type: 'rectangle', x: r.x + xOff, y: r.y + i * (segH + gap),
                width: segW, height: segH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: segH * 0.3, strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: Math.min(16, segH * 0.35),
                textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genAlternatingFlow(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const boxW = r.w * 0.35;
        const boxH = (r.h - 12 * (items.length - 1)) / items.length;
        const objects = [];
        // Compute box positions
        const boxes = items.map((_, i) => {
            const left = i % 2 === 0;
            const bx = left ? r.x : r.x + r.w - boxW;
            const by = r.y + i * (boxH + 12);
            return { bx, by, left, cx: bx + boxW / 2, cy: by + boxH / 2 };
        });
        // Zigzag arrows from current box's bottom-inner-corner to next box's top-inner-corner
        for (let i = 0; i < boxes.length - 1; i++) {
            const cur = boxes[i];
            const nxt = boxes[i + 1];
            const sx = cur.left ? cur.bx + boxW : cur.bx;
            const sy = cur.by + boxH;
            const ex = nxt.left ? nxt.bx + boxW : nxt.bx;
            const ey = nxt.by;
            // Use arrow with diagonal vector from inner corner to next inner corner
            objects.push({
                _saId: this._id(), _saRole: 'connector', _saIndex: i,
                type: 'arrow', x: sx, y: sy,
                width: ex - sx, height: ey - sy,
                fill: pal.connector, stroke: pal.connector, strokeWidth: 2
            });
        }
        items.forEach((item, i) => {
            const b = boxes[i];
            objects.push({
                _saId: this._id(), _saRole: 'step', _saIndex: i,
                type: 'rectangle', x: b.bx, y: b.by,
                width: boxW, height: boxH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 8, strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: Math.min(16, boxH * 0.35),
                textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    // ---- CYCLE generators ----

    _genBasicCycle(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const radius = Math.min(r.w, r.h) * 0.35;
        const nodeR = Math.min(60, radius * 0.45);
        const objects = [];
        // Pre-compute node centers so we can draw cycle arrows BEHIND the nodes
        const centers = items.map((_, i) => {
            const angle = (Math.PI * 2 * i / items.length) - Math.PI / 2;
            return { cx: cx + Math.cos(angle) * radius, cy: cy + Math.sin(angle) * radius };
        });
        // Cycle arrows between consecutive nodes (offset endpoints so arrowhead clears the circles)
        if (items.length > 1) {
            for (let i = 0; i < items.length; i++) {
                const a = centers[i];
                const b = centers[(i + 1) % items.length];
                const dx = b.cx - a.cx;
                const dy = b.cy - a.cy;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const ux = dx / len, uy = dy / len;
                const margin = nodeR + 6;
                const sx = a.cx + ux * margin;
                const sy = a.cy + uy * margin;
                const ex = b.cx - ux * margin;
                const ey = b.cy - uy * margin;
                objects.push({
                    _saId: this._id(), _saRole: 'cycle-arrow', _saIndex: i,
                    type: 'arrow', x: sx, y: sy,
                    width: ex - sx, height: ey - sy,
                    fill: pal.connector, stroke: pal.connector, strokeWidth: 2
                });
            }
        }
        // Nodes (drawn after arrows so they appear on top)
        items.forEach((item, i) => {
            const c = centers[i];
            objects.push({
                _saId: this._id(), _saRole: 'node', _saIndex: i,
                type: 'circle', x: c.cx - nodeR, y: c.cy - nodeR,
                width: nodeR * 2, height: nodeR * 2,
                fill: pal.colors[i % pal.colors.length],
                strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: Math.min(13, nodeR * 0.35),
                textAlign: 'center', fontWeight: '600'
            });
        });
        // Center ring visual (decorative)
        objects.push({
            _saId: this._id(), _saRole: 'center', _saIndex: -1,
            type: 'circle', x: cx - radius * 0.18, y: cy - radius * 0.18,
            width: radius * 0.36, height: radius * 0.36,
            fill: 'transparent', stroke: pal.connector, strokeWidth: 2
        });
        return { objects, connections: [] };
    }

    _genSegmentedCycle(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const outerR = Math.min(r.w, r.h) * 0.4;
        const objects = [];
        const segR = outerR * 0.55;
        const centers = items.map((_, i) => {
            const angle = (Math.PI * 2 * i / items.length) - Math.PI / 2;
            return {
                cx: cx + Math.cos(angle) * (outerR - segR / 2),
                cy: cy + Math.sin(angle) * (outerR - segR / 2)
            };
        });
        // Cycle arrows behind segments
        if (items.length > 1) {
            for (let i = 0; i < items.length; i++) {
                const a = centers[i];
                const b = centers[(i + 1) % items.length];
                const dx = b.cx - a.cx, dy = b.cy - a.cy;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const ux = dx / len, uy = dy / len;
                const margin = segR / 2 + 6;
                const sx = a.cx + ux * margin;
                const sy = a.cy + uy * margin;
                const ex = b.cx - ux * margin;
                const ey = b.cy - uy * margin;
                objects.push({
                    _saId: this._id(), _saRole: 'cycle-arrow', _saIndex: i,
                    type: 'arrow', x: sx, y: sy,
                    width: ex - sx, height: ey - sy,
                    fill: pal.connector, stroke: pal.connector, strokeWidth: 2
                });
            }
        }
        items.forEach((item, i) => {
            const c = centers[i];
            objects.push({
                _saId: this._id(), _saRole: 'segment', _saIndex: i,
                type: 'circle', x: c.cx - segR / 2, y: c.cy - segR / 2,
                width: segR, height: segR,
                fill: pal.colors[i % pal.colors.length],
                strokeWidth: 2, stroke: pal.bg,
                text: item.text, textColor: pal.text, fontSize: Math.min(12, segR * 0.2),
                textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genGearCycle(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const sizes = [0.35, 0.28, 0.25, 0.22];
        const positions = [
            { x: 0.3, y: 0.45 }, { x: 0.65, y: 0.35 },
            { x: 0.55, y: 0.7 }, { x: 0.2, y: 0.7 }
        ];
        const objects = [];
        items.forEach((item, i) => {
            if (i >= 4) return;
            const gearR = Math.min(r.w, r.h) * (sizes[i] || 0.22);
            const px = r.x + r.w * positions[i].x - gearR / 2;
            const py = r.y + r.h * positions[i].y - gearR / 2;
            objects.push({
                _saId: this._id(), _saRole: 'gear', _saIndex: i,
                type: 'star', x: px, y: py,
                width: gearR, height: gearR,
                sides: 8, innerRadius: 0.75,
                fill: pal.colors[i % pal.colors.length],
                strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: Math.min(13, gearR * 0.14),
                textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    // ---- HIERARCHY generators ----

    _hasImportedHierarchy(items) {
        return Array.isArray(items) && items.some(item => Number.isInteger(item?._depth) && item._depth > 0);
    }

    _genImportedHierarchy(items, pal, sw, sh, options = {}) {
        const r = this._region(sw, sh);
        const horizontal = options.orientation === 'horizontal';
        const showLevelLabels = !!options.showLevelLabels;
        const labelSpace = showLevelLabels && !horizontal ? 64 : 0;
        const nodes = items.map((item, index) => ({
            item,
            index,
            depth: Math.max(0, Math.min(6, Number.isInteger(item._depth) ? item._depth : 0)),
            parentIndex: Number.isInteger(item._parentIndex) ? item._parentIndex : null
        }));
        const lastAtDepth = [];
        nodes.forEach(node => {
            if (node.depth > 0 && (node.parentIndex == null || node.parentIndex >= node.index)) {
                node.parentIndex = lastAtDepth[node.depth - 1] ?? null;
            }
            lastAtDepth[node.depth] = node.index;
            lastAtDepth.length = node.depth + 1;
        });
        const maxDepth = nodes.reduce((max, node) => Math.max(max, node.depth), 0);
        const levels = Array.from({ length: maxDepth + 1 }, (_, depth) => nodes.filter(node => node.depth === depth));
        const positions = new Map();
        const maxLevelCount = levels.reduce((max, level) => Math.max(max, level.length), 1);
        const gap = maxLevelCount > 12 ? 4 : 10;
        const usableX = r.x + labelSpace;
        const usableW = Math.max(100, r.w - labelSpace);

        if (horizontal) {
            const nodeW = Math.max(72, Math.min(132, (r.w - gap * maxDepth) / Math.max(1, maxDepth + 1)));
            const columnGap = maxDepth ? (r.w - nodeW * (maxDepth + 1)) / maxDepth : 0;
            levels.forEach((level, depth) => {
                const nodeH = Math.max(16, Math.min(46, (r.h - gap * Math.max(0, level.length - 1)) / Math.max(1, level.length)));
                const totalH = level.length * nodeH + Math.max(0, level.length - 1) * gap;
                const startY = r.y + (r.h - totalH) / 2;
                level.forEach((node, position) => positions.set(node.index, {
                    x: r.x + depth * (nodeW + columnGap),
                    y: startY + position * (nodeH + gap),
                    width: nodeW,
                    height: nodeH
                }));
            });
        } else {
            const levelGap = maxDepth ? Math.max(18, (r.h - 48 * (maxDepth + 1)) / maxDepth) : 0;
            levels.forEach((level, depth) => {
                const nodeW = Math.max(24, Math.min(140, (usableW - gap * Math.max(0, level.length - 1)) / Math.max(1, level.length)));
                const totalW = level.length * nodeW + Math.max(0, level.length - 1) * gap;
                const startX = usableX + (usableW - totalW) / 2;
                level.forEach((node, position) => positions.set(node.index, {
                    x: startX + position * (nodeW + gap),
                    y: r.y + depth * (48 + levelGap),
                    width: nodeW,
                    height: 48
                }));
            });

            // Allocate a distinct horizontal span to every root subtree. This
            // keeps each parent's children together and prevents connector
            // rails from visually merging unrelated branches at the same level.
            const childrenByParent = new Map();
            nodes.forEach(node => {
                if (node.parentIndex == null) return;
                if (!childrenByParent.has(node.parentIndex)) childrenByParent.set(node.parentIndex, []);
                childrenByParent.get(node.parentIndex).push(node);
            });
            const weightCache = new Map();
            const subtreeWeight = node => {
                if (weightCache.has(node.index)) return weightCache.get(node.index);
                const children = childrenByParent.get(node.index) || [];
                const weight = children.length
                    ? children.reduce((sum, child) => sum + subtreeWeight(child), 0)
                    : 1;
                weightCache.set(node.index, weight);
                return weight;
            };
            const layoutSubtree = (node, left, width) => {
                const position = positions.get(node.index);
                if (position) {
                    const minimumWidth = node.depth === 0 ? 56 : 24;
                    const availableWidth = Math.max(minimumWidth, width - 2);
                    const preferredWidth = String(node.item.text || '').length > 70
                        ? Math.min(220, availableWidth)
                        : position.width;
                    position.width = Math.max(minimumWidth, Math.min(preferredWidth, availableWidth));
                    const center = left + width / 2;
                    position.x = Math.max(usableX, Math.min(usableX + usableW - position.width, center - position.width / 2));
                }
                const children = childrenByParent.get(node.index) || [];
                if (!children.length) return;
                const childGap = children.length > 1 ? Math.min(8, width / (children.length * 5)) : 0;
                const available = Math.max(1, width - childGap * (children.length - 1));
                const totalWeight = children.reduce((sum, child) => sum + subtreeWeight(child), 0) || 1;
                let cursor = left;
                children.forEach(child => {
                    const childWidth = available * subtreeWeight(child) / totalWeight;
                    layoutSubtree(child, cursor, childWidth);
                    cursor += childWidth + childGap;
                });
            };
            const roots = nodes.filter(node => node.depth === 0 || node.parentIndex == null);
            const rootGap = roots.length > 1 ? Math.min(14, usableW / (roots.length * 8)) : 0;
            const rootAvailable = Math.max(1, usableW - rootGap * Math.max(0, roots.length - 1));
            const totalRootWeight = roots.reduce((sum, root) => sum + subtreeWeight(root), 0) || 1;
            const rootMinimums = roots.map(root => Math.min(positions.get(root.index)?.width || 56, rootAvailable / Math.max(1, roots.length)));
            const rootMinimumTotal = rootMinimums.reduce((sum, width) => sum + width, 0);
            const rootExtra = Math.max(0, rootAvailable - rootMinimumTotal);
            let rootCursor = usableX;
            roots.forEach((root, rootIndex) => {
                const rootWidth = rootMinimums[rootIndex] + rootExtra * subtreeWeight(root) / totalRootWeight;
                layoutSubtree(root, rootCursor, rootWidth);
                rootCursor += rootWidth + rootGap;
            });

            const estimateLines = (text, width, fontSize) => {
                const maxChars = Math.max(4, Math.floor(Math.max(8, width - 16) / Math.max(3.5, fontSize * 0.56)));
                let lines = 1;
                let current = 0;
                String(text || '').split(/\s+/).filter(Boolean).forEach(word => {
                    const length = word.length;
                    if (current && current + 1 + length > maxChars) {
                        lines += 1;
                        current = length;
                    } else {
                        current += (current ? 1 : 0) + length;
                    }
                });
                return lines;
            };
            nodes.forEach(node => {
                const position = positions.get(node.index);
                if (!position) return;
                const preferredFont = Math.max(7, Math.min(node.depth === 0 ? 14 : 12, position.width / 9));
                const lineCount = estimateLines(node.item.text, position.width, preferredFont);
                position.height = Math.max(48, Math.min(140, Math.ceil(lineCount * preferredFont * 1.3 + 16)));
            });
            let levelHeights = levels.map(level => level.reduce((height, node) =>
                Math.max(height, positions.get(node.index)?.height || 48), 48));
            const minimumLevelGap = maxDepth ? 14 : 0;
            const availableForNodes = Math.max(36 * (maxDepth + 1), r.h - minimumLevelGap * maxDepth);
            const desiredNodeHeight = levelHeights.reduce((sum, height) => sum + height, 0);
            if (desiredNodeHeight > availableForNodes) {
                const scale = availableForNodes / desiredNodeHeight;
                nodes.forEach(node => {
                    const position = positions.get(node.index);
                    if (position) position.height = Math.max(36, position.height * scale);
                });
                levelHeights = levels.map(level => level.reduce((height, node) =>
                    Math.max(height, positions.get(node.index)?.height || 36), 36));
            }
            const fittedNodeHeight = levelHeights.reduce((sum, height) => sum + height, 0);
            const fittedLevelGap = maxDepth
                ? Math.max(minimumLevelGap, (r.h - fittedNodeHeight) / maxDepth)
                : 0;
            let levelY = r.y;
            levels.forEach((level, depth) => {
                const levelHeight = levelHeights[depth];
                level.forEach(node => {
                    const position = positions.get(node.index);
                    if (position) position.y = levelY + (levelHeight - position.height) / 2;
                });
                levelY += levelHeight + fittedLevelGap;
            });
        }

        const objects = [];
        nodes.forEach(node => {
            if (node.parentIndex == null) return;
            const parent = positions.get(node.parentIndex);
            const child = positions.get(node.index);
            if (!parent || !child) return;
            if (horizontal) {
                const startX = parent.x + parent.width;
                const startY = parent.y + parent.height / 2;
                const endX = child.x;
                const endY = child.y + child.height / 2;
                const midX = (startX + endX) / 2;
                objects.push({ _saId: this._id(), _saRole: 'connector', _saIndex: -1, _saParentIndex: node.parentIndex, _saChildIndex: node.index, type: 'line', x: startX, y: startY, width: midX - startX, height: 0, stroke: pal.connector, strokeWidth: 2 });
                objects.push({ _saId: this._id(), _saRole: 'connector', _saIndex: -1, _saParentIndex: node.parentIndex, _saChildIndex: node.index, type: 'line', x: midX, y: Math.min(startY, endY), width: 0, height: Math.abs(endY - startY), stroke: pal.connector, strokeWidth: 2 });
                objects.push({ _saId: this._id(), _saRole: 'connector', _saIndex: -1, _saParentIndex: node.parentIndex, _saChildIndex: node.index, type: 'line', x: midX, y: endY, width: endX - midX, height: 0, stroke: pal.connector, strokeWidth: 2 });
            } else {
                const startX = parent.x + parent.width / 2;
                const startY = parent.y + parent.height;
                const endX = child.x + child.width / 2;
                const endY = child.y;
                const midY = (startY + endY) / 2;
                objects.push({ _saId: this._id(), _saRole: 'connector', _saIndex: -1, _saParentIndex: node.parentIndex, _saChildIndex: node.index, type: 'line', x: startX, y: startY, width: 0, height: midY - startY, stroke: pal.connector, strokeWidth: 2 });
                objects.push({ _saId: this._id(), _saRole: 'connector', _saIndex: -1, _saParentIndex: node.parentIndex, _saChildIndex: node.index, type: 'line', x: Math.min(startX, endX), y: midY, width: Math.abs(endX - startX), height: 0, stroke: pal.connector, strokeWidth: 2 });
                objects.push({ _saId: this._id(), _saRole: 'connector', _saIndex: -1, _saParentIndex: node.parentIndex, _saChildIndex: node.index, type: 'line', x: endX, y: midY, width: 0, height: endY - midY, stroke: pal.connector, strokeWidth: 2 });
            }
        });

        if (showLevelLabels && !horizontal) {
            levels.forEach((level, depth) => {
                if (!level.length) return;
                const position = positions.get(level[0].index);
                objects.push({
                    _saId: this._id(), _saRole: 'level-label', _saIndex: depth,
                    type: 'text', x: r.x, y: position.y, width: 58, height: position.height,
                    text: `Level ${depth + 1}`, textColor: pal.connector, fontSize: 10,
                    textAlign: 'center', fontWeight: '600', fill: 'transparent', strokeWidth: 0
                });
            });
        }

        nodes.forEach(node => {
            const position = positions.get(node.index);
            if (!position) return;
            objects.push({
                _saId: this._id(), _saRole: node.depth === 0 ? 'root' : 'child', _saIndex: node.index,
                type: 'rectangle', ...position,
                fill: pal.colors[node.depth % pal.colors.length], borderRadius: 7, strokeWidth: 0,
                text: node.item.text, textColor: pal.text,
                fontSize: Math.max(7, Math.min(node.depth === 0 ? 14 : 12, position.width / 9, position.height / 3)),
                fitText: true, minFontSize: 6,
                textAlign: 'center', fontWeight: node.depth === 0 ? '700' : '500'
            });
        });
        return { objects, connections: [] };
    }

    _genOrgChart(items, pal, sw, sh) {
        if (this._hasImportedHierarchy(items)) return this._genImportedHierarchy(items, pal, sw, sh);
        const r = this._region(sw, sh);
        const objects = [];
        // Simple tree: item[0] = root, items[1..] split into rows
        const boxW = 140, boxH = 50;
        // Root
        const rootX = r.x + (r.w - boxW) / 2;
        const rootY = r.y;
        const rootCx = rootX + boxW / 2;
        const rootBottom = rootY + boxH;
        const rootId = this._id();
        objects.push({
            _saId: rootId, _saRole: 'root', _saIndex: 0,
            type: 'rectangle', x: rootX, y: rootY,
            width: boxW, height: boxH,
            fill: pal.colors[0], borderRadius: 8, strokeWidth: 0,
            text: items[0].text, textColor: pal.text, fontSize: 14,
            textAlign: 'center', fontWeight: '700'
        });
        // Children rows
        const children = items.slice(1);
        const rowH = boxH + 40;
        // Split into max 4 per row
        const perRow = Math.min(4, children.length);
        const rows = [];
        for (let i = 0; i < children.length; i += perRow) {
            rows.push(children.slice(i, i + perRow));
        }
        // Pre-compute per-row positions
        const rowPos = rows.map((row, ri) => {
            const rowW = row.length * (boxW + 20) - 20;
            const startX = r.x + (r.w - rowW) / 2;
            const yy = rootY + (ri + 1) * rowH;
            return row.map((item, ci) => ({
                x: startX + ci * (boxW + 20),
                y: yy,
                cx: startX + ci * (boxW + 20) + boxW / 2,
                top: yy,
                bottom: yy + boxH,
                text: item.text
            }));
        });
        // Draw tree connectors BEFORE child rectangles so they sit behind
        const connStroke = pal.connector;
        if (rowPos.length > 0) {
            const row0 = rowPos[0];
            const barY = (rootBottom + row0[0].top) / 2;
            // Trunk: root center down to horizontal bar
            objects.push({
                _saId: this._id(), _saRole: 'connector', _saIndex: -1,
                type: 'line', x: rootCx, y: rootBottom,
                width: 0, height: barY - rootBottom,
                stroke: connStroke, strokeWidth: 2
            });
            if (row0.length > 1) {
                const leftX = row0[0].cx;
                const rightX = row0[row0.length - 1].cx;
                objects.push({
                    _saId: this._id(), _saRole: 'connector', _saIndex: -1,
                    type: 'line', x: leftX, y: barY,
                    width: rightX - leftX, height: 0,
                    stroke: connStroke, strokeWidth: 2
                });
            }
            // Drops from bar to each row-0 child
            row0.forEach(c => {
                objects.push({
                    _saId: this._id(), _saRole: 'connector', _saIndex: -1,
                    type: 'line', x: c.cx, y: barY,
                    width: 0, height: c.top - barY,
                    stroke: connStroke, strokeWidth: 2
                });
            });
            // Subsequent rows: connect each child to nearest parent column above
            for (let ri = 1; ri < rowPos.length; ri++) {
                const parents = rowPos[ri - 1];
                rowPos[ri].forEach((kid, ki) => {
                    const parent = parents[Math.min(ki, parents.length - 1)];
                    const midY = (parent.bottom + kid.top) / 2;
                    // Vertical from parent
                    objects.push({
                        _saId: this._id(), _saRole: 'connector', _saIndex: -1,
                        type: 'line', x: parent.cx, y: parent.bottom,
                        width: 0, height: midY - parent.bottom,
                        stroke: connStroke, strokeWidth: 2
                    });
                    // Horizontal jog if columns differ
                    if (parent.cx !== kid.cx) {
                        const x1 = Math.min(parent.cx, kid.cx);
                        const w = Math.abs(kid.cx - parent.cx);
                        objects.push({
                            _saId: this._id(), _saRole: 'connector', _saIndex: -1,
                            type: 'line', x: x1, y: midY,
                            width: w, height: 0,
                            stroke: connStroke, strokeWidth: 2
                        });
                    }
                    // Vertical down to child
                    objects.push({
                        _saId: this._id(), _saRole: 'connector', _saIndex: -1,
                        type: 'line', x: kid.cx, y: midY,
                        width: 0, height: kid.top - midY,
                        stroke: connStroke, strokeWidth: 2
                    });
                });
            }
        }
        // Now push the child rectangles (drawn on top of connectors)
        rowPos.forEach((row, ri) => {
            row.forEach((c, ci) => {
                objects.push({
                    _saId: this._id(), _saRole: 'child', _saIndex: ri * perRow + ci + 1,
                    type: 'rectangle', x: c.x, y: c.y,
                    width: boxW, height: boxH,
                    fill: pal.colors[(ri + 1) % pal.colors.length],
                    borderRadius: 8, strokeWidth: 0,
                    text: c.text, textColor: pal.text, fontSize: 13,
                    textAlign: 'center', fontWeight: '500'
                });
            });
        });
        return { objects, connections: [] };
    }

    _genHorizontalHierarchy(items, pal, sw, sh) {
        if (this._hasImportedHierarchy(items)) return this._genImportedHierarchy(items, pal, sw, sh, { orientation: 'horizontal' });
        const r = this._region(sw, sh);
        const objects = [];
        const boxW = 130, boxH = 45;
        const rootX = r.x;
        const rootY = r.y + (r.h - boxH) / 2;
        const rootRight = rootX + boxW;
        const rootCy = rootY + boxH / 2;
        objects.push({
            _saId: this._id(), _saRole: 'root', _saIndex: 0,
            type: 'rectangle', x: rootX, y: rootY,
            width: boxW, height: boxH,
            fill: pal.colors[0], borderRadius: 8, strokeWidth: 0,
            text: items[0].text, textColor: pal.text, fontSize: 14,
            textAlign: 'center', fontWeight: '700'
        });
        const children = items.slice(1);
        const colX = rootX + boxW + 60;
        const totalH = children.length * (boxH + 12) - 12;
        const startY = r.y + (r.h - totalH) / 2;
        // Tree connectors: trunk right from root → vertical spine → horizontal stubs to each child
        const spineX = (rootRight + colX) / 2;
        objects.push({
            _saId: this._id(), _saRole: 'connector', _saIndex: -1,
            type: 'line', x: rootRight, y: rootCy,
            width: spineX - rootRight, height: 0,
            stroke: pal.connector, strokeWidth: 2
        });
        if (children.length > 1) {
            const firstY = startY + boxH / 2;
            const lastY = startY + (children.length - 1) * (boxH + 12) + boxH / 2;
            objects.push({
                _saId: this._id(), _saRole: 'connector', _saIndex: -1,
                type: 'line', x: spineX, y: firstY,
                width: 0, height: lastY - firstY,
                stroke: pal.connector, strokeWidth: 2
            });
        }
        children.forEach((item, i) => {
            const childY = startY + i * (boxH + 12);
            const childCy = childY + boxH / 2;
            // Stub from spine to child
            objects.push({
                _saId: this._id(), _saRole: 'connector', _saIndex: -1,
                type: 'line', x: spineX, y: childCy,
                width: colX - spineX, height: 0,
                stroke: pal.connector, strokeWidth: 2
            });
            objects.push({
                _saId: this._id(), _saRole: 'child', _saIndex: i + 1,
                type: 'rectangle', x: colX, y: childY,
                width: boxW, height: boxH,
                fill: pal.colors[(i + 1) % pal.colors.length],
                borderRadius: 8, strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: 13,
                textAlign: 'center', fontWeight: '500'
            });
        });
        return { objects, connections: [] };
    }

    // ---- RELATIONSHIP generators ----

    _genBasicVenn(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const vennR = Math.min(r.w, r.h) * 0.3;
        const spread = vennR * 0.6;
        const objects = [];
        items.forEach((item, i) => {
            const angle = (Math.PI * 2 * i / items.length) - Math.PI / 2;
            const nx = cx + Math.cos(angle) * spread - vennR;
            const ny = cy + Math.sin(angle) * spread - vennR;
            objects.push({
                _saId: this._id(), _saRole: 'venn', _saIndex: i,
                type: 'circle', x: nx, y: ny,
                width: vennR * 2, height: vennR * 2,
                fill: pal.colors[i % pal.colors.length],
                opacity: 0.6, strokeWidth: 2, stroke: '#ffffff',
                text: item.text, textColor: pal.text, fontSize: Math.min(16, vennR * 0.2),
                textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genTargetDiagram(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const maxR = Math.min(r.w, r.h) * 0.42;
        const objects = [];
        // Outermost first (reverse so inner is on top)
        for (let i = items.length - 1; i >= 0; i--) {
            const radius = maxR * ((items.length - i) / items.length);
            objects.push({
                _saId: this._id(), _saRole: 'ring', _saIndex: i,
                type: 'circle', x: cx - radius, y: cy - radius,
                width: radius * 2, height: radius * 2,
                fill: pal.colors[i % pal.colors.length],
                strokeWidth: 2, stroke: pal.bg,
                text: items[i].text, textColor: pal.text, fontSize: Math.min(14, radius * 0.22),
                textAlign: 'center', fontWeight: '600'
            });
        }
        return { objects, connections: [] };
    }

    _genRadialDiagram(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const hubR = Math.min(r.w, r.h) * 0.12;
        const orbitR = Math.min(r.w, r.h) * 0.35;
        const nodeR = Math.min(50, orbitR * 0.35);
        const objects = [];
        const satellites = items.slice(1);
        // Spokes from hub edge to satellite edge (drawn first so they sit behind nodes)
        satellites.forEach((item, i) => {
            const angle = (Math.PI * 2 * i / satellites.length) - Math.PI / 2;
            const ux = Math.cos(angle), uy = Math.sin(angle);
            const sx = cx + ux * hubR;
            const sy = cy + uy * hubR;
            const ex = cx + ux * (orbitR - nodeR);
            const ey = cy + uy * (orbitR - nodeR);
            objects.push({
                _saId: this._id(), _saRole: 'spoke', _saIndex: i + 1,
                type: 'line', x: sx, y: sy,
                width: ex - sx, height: ey - sy,
                stroke: pal.connector, strokeWidth: 2
            });
        });
        // Center hub
        objects.push({
            _saId: this._id(), _saRole: 'hub', _saIndex: 0,
            type: 'circle', x: cx - hubR, y: cy - hubR,
            width: hubR * 2, height: hubR * 2,
            fill: pal.colors[0], strokeWidth: 0,
            text: items[0].text, textColor: pal.text, fontSize: Math.min(14, hubR * 0.35),
            textAlign: 'center', fontWeight: '700'
        });
        // Satellite nodes
        satellites.forEach((item, i) => {
            const angle = (Math.PI * 2 * i / satellites.length) - Math.PI / 2;
            const nx = cx + Math.cos(angle) * orbitR - nodeR;
            const ny = cy + Math.sin(angle) * orbitR - nodeR;
            objects.push({
                _saId: this._id(), _saRole: 'satellite', _saIndex: i + 1,
                type: 'circle', x: nx, y: ny,
                width: nodeR * 2, height: nodeR * 2,
                fill: pal.colors[(i + 1) % pal.colors.length],
                strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: Math.min(12, nodeR * 0.3),
                textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genOpposingIdeas(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const boxW = r.w * 0.38;
        const boxH = r.h * 0.6;
        const gap = r.w * 0.04;
        const objects = [];
        // Left side
        objects.push({
            _saId: this._id(), _saRole: 'side', _saIndex: 0,
            type: 'rectangle', x: r.x, y: r.y + (r.h - boxH) / 2,
            width: boxW, height: boxH,
            fill: pal.colors[0], borderRadius: 12, strokeWidth: 0,
            text: items[0].text, textColor: pal.text, fontSize: 20,
            textAlign: 'center', fontWeight: '700'
        });
        // VS circle
        const vsR = 30;
        objects.push({
            _saId: this._id(), _saRole: 'versus', _saIndex: -1,
            type: 'circle', x: r.x + r.w / 2 - vsR, y: r.y + r.h / 2 - vsR,
            width: vsR * 2, height: vsR * 2,
            fill: pal.connector, strokeWidth: 0,
            text: 'VS', textColor: '#ffffff', fontSize: 16,
            textAlign: 'center', fontWeight: '800'
        });
        // Right side
        objects.push({
            _saId: this._id(), _saRole: 'side', _saIndex: 1,
            type: 'rectangle', x: r.x + r.w - boxW, y: r.y + (r.h - boxH) / 2,
            width: boxW, height: boxH,
            fill: pal.colors[1], borderRadius: 12, strokeWidth: 0,
            text: items[1].text, textColor: pal.text, fontSize: 20,
            textAlign: 'center', fontWeight: '700'
        });
        return { objects, connections: [] };
    }

    _genEquation(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const n = items.length;
        const boxW = r.w * 0.18;
        const boxH = r.h * 0.4;
        const opW = 40;
        const totalW = n * boxW + (n - 1) * opW;
        const startX = r.x + (r.w - totalW) / 2;
        const yy = r.y + (r.h - boxH) / 2;
        const objects = [];
        items.forEach((item, i) => {
            objects.push({
                _saId: this._id(), _saRole: 'term', _saIndex: i,
                type: 'rectangle', x: startX + i * (boxW + opW), y: yy,
                width: boxW, height: boxH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 10, strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: Math.min(16, boxW * 0.15),
                textAlign: 'center', fontWeight: '600'
            });
            if (i < n - 1) {
                const symbol = i < n - 2 ? '+' : '=';
                objects.push({
                    _saId: this._id(), _saRole: 'operator', _saIndex: i,
                    type: 'text', x: startX + i * (boxW + opW) + boxW + 2, y: yy + boxH / 2 - 16,
                    width: opW - 4, height: 32,
                    text: symbol, textColor: pal.text === '#ffffff' ? '#cccccc' : '#555555',
                    fontSize: 28, textAlign: 'center', fontWeight: '700',
                    fill: 'transparent', strokeWidth: 0
                });
            }
        });
        return { objects, connections: [] };
    }

    // ---- MATRIX generators ----

    _genBasicMatrix(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 12;
        const cellW = (r.w - gap) / 2;
        const cellH = (r.h - gap) / 2;
        const objects = [];
        const positions = [[0,0],[1,0],[0,1],[1,1]];
        items.forEach((item, i) => {
            if (i >= 4) return;
            const [col, row] = positions[i];
            objects.push({
                _saId: this._id(), _saRole: 'cell', _saIndex: i,
                type: 'rectangle', x: r.x + col * (cellW + gap), y: r.y + row * (cellH + gap),
                width: cellW, height: cellH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 10, strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: 18,
                textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genSWOTMatrix(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 8;
        const cellW = (r.w - gap) / 2;
        const cellH = (r.h - gap) / 2;
        const swotColors = ['#27AE60','#E74C3C','#3498DB','#F39C12'];
        const swotLabels = ['Strengths','Weaknesses','Opportunities','Threats'];
        const positions = [[0,0],[1,0],[0,1],[1,1]];
        const objects = [];
        items.forEach((item, i) => {
            if (i >= 4) return;
            const [col, row] = positions[i];
            objects.push({
                _saId: this._id(), _saRole: 'cell', _saIndex: i,
                type: 'rectangle', x: r.x + col * (cellW + gap), y: r.y + row * (cellH + gap),
                width: cellW, height: cellH,
                fill: swotColors[i], borderRadius: 10, strokeWidth: 0,
                text: item.text || swotLabels[i], textColor: '#ffffff', fontSize: 18,
                textAlign: 'center', fontWeight: '700'
            });
        });
        return { objects, connections: [] };
    }

    // ---- PYRAMID generators ----

    _genBasicPyramid(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 5;
        const layerH = (r.h - gap * (items.length - 1)) / items.length;
        const objects = [];
        items.forEach((item, i) => {
            // Width narrows towards top
            const ratio = (items.length - i) / items.length;
            const layerW = r.w * (0.3 + 0.7 * ratio);
            const xOff = (r.w - layerW) / 2;
            objects.push({
                _saId: this._id(), _saRole: 'layer', _saIndex: i,
                type: 'rectangle', x: r.x + xOff, y: r.y + (items.length - 1 - i) * (layerH + gap),
                width: layerW, height: layerH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 4, strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: Math.min(16, layerH * 0.4),
                textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genInvertedPyramid(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 5;
        const layerH = (r.h - gap * (items.length - 1)) / items.length;
        const objects = [];
        items.forEach((item, i) => {
            const ratio = (items.length - i) / items.length;
            const layerW = r.w * (0.3 + 0.7 * ratio);
            const xOff = (r.w - layerW) / 2;
            objects.push({
                _saId: this._id(), _saRole: 'layer', _saIndex: i,
                type: 'rectangle', x: r.x + xOff, y: r.y + i * (layerH + gap),
                width: layerW, height: layerH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 4, strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: Math.min(16, layerH * 0.4),
                textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    // ---- PICTURE generators ----

    _genPictureGrid(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const cols = Math.ceil(Math.sqrt(items.length));
        const rows = Math.ceil(items.length / cols);
        const gap = 14;
        const cellW = (r.w - gap * (cols - 1)) / cols;
        const cellH = (r.h - gap * (rows - 1)) / rows;
        const imgH = cellH * 0.65;
        const objects = [];
        items.forEach((item, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = r.x + col * (cellW + gap);
            const cy = r.y + row * (cellH + gap);
            // Image placeholder
            objects.push({
                _saId: this._id(), _saRole: 'image', _saIndex: i,
                type: 'rectangle', x: cx, y: cy,
                width: cellW, height: imgH,
                fill: pal.colors[i % pal.colors.length] + '44',
                borderRadius: 8, strokeWidth: 1, stroke: pal.colors[i % pal.colors.length],
                text: '🖼', fontSize: Math.min(30, imgH * 0.4), textAlign: 'center'
            });
            // Caption
            objects.push({
                _saId: this._id(), _saRole: 'caption', _saIndex: i,
                type: 'text', x: cx, y: cy + imgH + 4,
                width: cellW, height: cellH - imgH - 4,
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: Math.min(13, cellW * 0.12), textAlign: 'center', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genPictureStrip(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 14;
        const cardW = (r.w - gap * (items.length - 1)) / items.length;
        const cardH = r.h * 0.8;
        const imgH = cardH * 0.7;
        const yy = r.y + (r.h - cardH) / 2;
        const objects = [];
        items.forEach((item, i) => {
            const cx = r.x + i * (cardW + gap);
            objects.push({
                _saId: this._id(), _saRole: 'card', _saIndex: i,
                type: 'rectangle', x: cx, y: yy,
                width: cardW, height: cardH,
                fill: pal.bg === '#ffffff' ? '#f8f8f8' : '#22223c',
                borderRadius: 10, strokeWidth: 1, stroke: pal.colors[i % pal.colors.length]
            });
            objects.push({
                _saId: this._id(), _saRole: 'image', _saIndex: i,
                type: 'rectangle', x: cx + 6, y: yy + 6,
                width: cardW - 12, height: imgH - 12,
                fill: pal.colors[i % pal.colors.length] + '33',
                borderRadius: 6, strokeWidth: 0,
                text: '🖼', fontSize: 24, textAlign: 'center'
            });
            objects.push({
                _saId: this._id(), _saRole: 'caption', _saIndex: i,
                type: 'text', x: cx + 6, y: yy + imgH + 2,
                width: cardW - 12, height: cardH - imgH - 8,
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: Math.min(13, cardW * 0.12), textAlign: 'center', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    /* ==================================================================
       ADDITIONAL GENERATOR IMPLEMENTATIONS
       ================================================================== */

    // ---- Additional LIST generators ----

    _genGroupedList(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 10;
        const itemH = (r.h - gap * (items.length - 1)) / items.length;
        const headerW = r.w * 0.22;
        const objects = [];
        items.forEach((item, i) => {
            const yy = r.y + i * (itemH + gap);
            objects.push({
                _saId: this._id(), _saRole: 'header', _saIndex: i,
                type: 'rectangle', x: r.x, y: yy,
                width: headerW, height: itemH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 8, strokeWidth: 0,
                text: `${i + 1}`, textColor: pal.text, fontSize: Math.min(24, itemH * 0.45),
                textAlign: 'center', fontWeight: '700'
            });
            objects.push({
                _saId: this._id(), _saRole: 'body', _saIndex: i,
                type: 'rectangle', x: r.x + headerW + 4, y: yy,
                width: r.w - headerW - 4, height: itemH,
                fill: pal.colors[i % pal.colors.length] + '22',
                borderRadius: 8, strokeWidth: 0,
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: Math.min(15, itemH * 0.35), textAlign: 'left', fontWeight: '500'
            });
        });
        return { objects, connections: [] };
    }

    _genTableList(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 2;
        const headerH = 40;
        const rowH = (r.h - headerH - gap * items.length) / items.length;
        const objects = [];
        objects.push({
            _saId: this._id(), _saRole: 'header', _saIndex: -1,
            type: 'rectangle', x: r.x, y: r.y,
            width: r.w, height: headerH,
            fill: pal.colors[0], borderRadius: 6, strokeWidth: 0,
            text: 'Items', textColor: pal.text, fontSize: 15,
            textAlign: 'center', fontWeight: '700'
        });
        items.forEach((item, i) => {
            const yy = r.y + headerH + gap + i * (rowH + gap);
            const isEven = i % 2 === 0;
            objects.push({
                _saId: this._id(), _saRole: 'row', _saIndex: i,
                type: 'rectangle', x: r.x, y: yy,
                width: r.w, height: rowH,
                fill: isEven ? (pal.bg === '#ffffff' ? '#f0f0f5' : '#1e1e34') : (pal.bg === '#ffffff' ? '#fafafa' : '#16162a'),
                borderRadius: 4, strokeWidth: 0,
                text: `${i + 1}.  ${item.text}`,
                textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: Math.min(14, rowH * 0.4), textAlign: 'left', fontWeight: '500'
            });
        });
        return { objects, connections: [] };
    }

    _genLinedList(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 8;
        const itemH = (r.h - gap * (items.length - 1)) / items.length;
        const dotR = Math.min(20, itemH * 0.4);
        const objects = [];
        items.forEach((item, i) => {
            const yy = r.y + i * (itemH + gap);
            objects.push({
                _saId: this._id(), _saRole: 'dot', _saIndex: i,
                type: 'circle', x: r.x, y: yy + (itemH - dotR) / 2,
                width: dotR, height: dotR,
                fill: pal.colors[i % pal.colors.length], strokeWidth: 0
            });
            if (i < items.length - 1) {
                objects.push({
                    _saId: this._id(), _saRole: 'line', _saIndex: i,
                    type: 'line', x: r.x, y: yy + itemH + gap / 2, width: r.w, height: 0,
                    stroke: pal.colors[i % pal.colors.length] + '44', strokeWidth: 1, fill: 'transparent'
                });
            }
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: r.x + dotR + 14, y: yy,
                width: r.w - dotR - 14, height: itemH,
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: Math.min(16, itemH * 0.4), textAlign: 'left', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    // ---- Additional PROCESS generators ----

    _genCircularProcess(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const radius = Math.min(r.w, r.h) * 0.35;
        const nodeR = Math.min(55, radius * 0.42);
        const objects = [];
        items.forEach((item, i) => {
            const angle = (Math.PI * 2 * i / items.length) - Math.PI / 2;
            const nx = cx + Math.cos(angle) * radius - nodeR;
            const ny = cy + Math.sin(angle) * radius - nodeR;
            objects.push({
                _saId: this._id(), _saRole: 'step', _saIndex: i,
                type: 'rectangle', x: nx, y: ny,
                width: nodeR * 2, height: nodeR * 2,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 12, strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: Math.min(12, nodeR * 0.25),
                textAlign: 'center', fontWeight: '600'
            });
            if (items.length > 1) {
                const nextAngle = (Math.PI * 2 * ((i + 1) % items.length) / items.length) - Math.PI / 2;
                const midAngle = angle + (nextAngle - angle + Math.PI * 2) % (Math.PI * 2) / 2;
                const ax = cx + Math.cos(midAngle) * (radius * 0.72) - 8;
                const ay = cy + Math.sin(midAngle) * (radius * 0.72) - 8;
                objects.push({
                    _saId: this._id(), _saRole: 'arrow', _saIndex: i,
                    type: 'text', x: ax, y: ay, width: 16, height: 16,
                    text: '\u2192', textColor: pal.connector, fontSize: 16,
                    textAlign: 'center', fontWeight: '700',
                    fill: 'transparent', strokeWidth: 0
                });
            }
        });
        return { objects, connections: [] };
    }

    _genAscendingBlocks(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 10;
        const blockW = (r.w - gap * (items.length - 1)) / items.length;
        const objects = [];
        const tops = items.map((_, i) => {
            const heightRatio = 0.3 + 0.7 * ((i + 1) / items.length);
            const blockH = r.h * heightRatio;
            return { x: r.x + i * (blockW + gap), top: r.y + r.h - blockH, h: blockH };
        });
        // Connector arrows from top of each block to top of next (rising trend)
        for (let i = 0; i < tops.length - 1; i++) {
            const a = tops[i];
            const b = tops[i + 1];
            const sx = a.x + blockW;
            const sy = a.top;
            const ex = b.x;
            const ey = b.top;
            objects.push({
                _saId: this._id(), _saRole: 'connector', _saIndex: i,
                type: 'arrow', x: sx, y: sy,
                width: ex - sx, height: ey - sy,
                fill: pal.connector, stroke: pal.connector, strokeWidth: 2
            });
        }
        items.forEach((item, i) => {
            const t = tops[i];
            objects.push({
                _saId: this._id(), _saRole: 'block', _saIndex: i,
                type: 'rectangle', x: t.x, y: t.top,
                width: blockW, height: t.h,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 8, strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: Math.min(14, blockW * 0.14),
                textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genPhasedProcess(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 12;
        const phaseW = (r.w - gap * (items.length - 1)) / items.length;
        const numH = 40;
        const bodyH = r.h * 0.6;
        const yy = r.y + (r.h - numH - bodyH - 8) / 2;
        const objects = [];
        // Connector arrows between number circles (drawn first so circles overlay endpoints)
        const numCy = yy + numH / 2;
        for (let i = 0; i < items.length - 1; i++) {
            const px = r.x + i * (phaseW + gap);
            const nx = r.x + (i + 1) * (phaseW + gap);
            const sx = px + (phaseW + numH) / 2 + 4;
            const ex = nx + (phaseW - numH) / 2 - 4;
            objects.push({
                _saId: this._id(), _saRole: 'connector', _saIndex: i,
                type: 'arrow', x: sx, y: numCy,
                width: ex - sx, height: 0,
                fill: pal.connector, stroke: pal.connector, strokeWidth: 2
            });
        }
        items.forEach((item, i) => {
            const px = r.x + i * (phaseW + gap);
            objects.push({
                _saId: this._id(), _saRole: 'number', _saIndex: i,
                type: 'circle', x: px + (phaseW - numH) / 2, y: yy,
                width: numH, height: numH,
                fill: pal.colors[i % pal.colors.length], strokeWidth: 0,
                text: String(i + 1), textColor: pal.text, fontSize: 18,
                textAlign: 'center', fontWeight: '700'
            });
            objects.push({
                _saId: this._id(), _saRole: 'body', _saIndex: i,
                type: 'rectangle', x: px, y: yy + numH + 8,
                width: phaseW, height: bodyH,
                fill: pal.colors[i % pal.colors.length] + '22',
                borderRadius: 10, strokeWidth: 1, stroke: pal.colors[i % pal.colors.length],
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: Math.min(14, phaseW * 0.12), textAlign: 'center', fontWeight: '500'
            });
        });
        return { objects, connections: [] };
    }

    // ---- Additional CYCLE generators ----

    _genContinuousCycle(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const radius = Math.min(r.w, r.h) * 0.33;
        const nodeW = Math.min(90, radius * 0.7);
        const nodeH = Math.min(50, radius * 0.4);
        const objects = [];
        const centers = items.map((_, i) => {
            const angle = (Math.PI * 2 * i / items.length) - Math.PI / 2;
            return { cx: cx + Math.cos(angle) * radius, cy: cy + Math.sin(angle) * radius };
        });
        if (items.length > 1) {
            for (let i = 0; i < items.length; i++) {
                const a = centers[i];
                const b = centers[(i + 1) % items.length];
                const dx = b.cx - a.cx, dy = b.cy - a.cy;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const ux = dx / len, uy = dy / len;
                const margin = Math.max(nodeW, nodeH) / 2 + 4;
                const sx = a.cx + ux * margin;
                const sy = a.cy + uy * margin;
                const ex = b.cx - ux * margin;
                const ey = b.cy - uy * margin;
                objects.push({
                    _saId: this._id(), _saRole: 'cycle-arrow', _saIndex: i,
                    type: 'arrow', x: sx, y: sy,
                    width: ex - sx, height: ey - sy,
                    fill: pal.connector, stroke: pal.connector, strokeWidth: 2
                });
            }
        }
        items.forEach((item, i) => {
            const c = centers[i];
            objects.push({
                _saId: this._id(), _saRole: 'node', _saIndex: i,
                type: 'rectangle', x: c.cx - nodeW / 2, y: c.cy - nodeH / 2,
                width: nodeW, height: nodeH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: nodeH / 2, strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: Math.min(12, nodeW * 0.14),
                textAlign: 'center', fontWeight: '600'
            });
        });
        objects.push({
            _saId: this._id(), _saRole: 'center', _saIndex: -1,
            type: 'circle', x: cx - radius * 0.2, y: cy - radius * 0.2,
            width: radius * 0.4, height: radius * 0.4,
            fill: 'transparent', stroke: pal.connector, strokeWidth: 2,
            text: '\u21BB', textColor: pal.connector, fontSize: 22, textAlign: 'center'
        });
        return { objects, connections: [] };
    }

    _genBlockCycle(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const radius = Math.min(r.w, r.h) * 0.32;
        const blockSize = Math.min(70, radius * 0.55);
        const objects = [];
        const centers = items.map((_, i) => {
            const angle = (Math.PI * 2 * i / items.length) - Math.PI / 2;
            return { cx: cx + Math.cos(angle) * radius, cy: cy + Math.sin(angle) * radius };
        });
        if (items.length > 1) {
            for (let i = 0; i < items.length; i++) {
                const a = centers[i];
                const b = centers[(i + 1) % items.length];
                const dx = b.cx - a.cx, dy = b.cy - a.cy;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const ux = dx / len, uy = dy / len;
                const margin = blockSize / 2 + 6;
                const sx = a.cx + ux * margin;
                const sy = a.cy + uy * margin;
                const ex = b.cx - ux * margin;
                const ey = b.cy - uy * margin;
                objects.push({
                    _saId: this._id(), _saRole: 'cycle-arrow', _saIndex: i,
                    type: 'arrow', x: sx, y: sy,
                    width: ex - sx, height: ey - sy,
                    fill: pal.connector, stroke: pal.connector, strokeWidth: 2
                });
            }
        }
        items.forEach((item, i) => {
            const c = centers[i];
            objects.push({
                _saId: this._id(), _saRole: 'block', _saIndex: i,
                type: 'rectangle', x: c.cx - blockSize / 2, y: c.cy - blockSize / 2,
                width: blockSize, height: blockSize,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 10, strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: Math.min(11, blockSize * 0.17),
                textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genTextCycle(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const radius = Math.min(r.w, r.h) * 0.35;
        const objects = [];
        objects.push({
            _saId: this._id(), _saRole: 'ring', _saIndex: -1,
            type: 'circle', x: cx - radius, y: cy - radius,
            width: radius * 2, height: radius * 2,
            fill: 'transparent', stroke: pal.connector, strokeWidth: 2
        });
        const labelW = 80, labelH = 30;
        items.forEach((item, i) => {
            const angle = (Math.PI * 2 * i / items.length) - Math.PI / 2;
            const nx = cx + Math.cos(angle) * radius - labelW / 2;
            const ny = cy + Math.sin(angle) * radius - labelH / 2;
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'rectangle', x: nx, y: ny,
                width: labelW, height: labelH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 15, strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: 11,
                textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    // ---- Additional HIERARCHY generators ----

    _genLabeledHierarchy(items, pal, sw, sh) {
        if (this._hasImportedHierarchy(items)) return this._genImportedHierarchy(items, pal, sw, sh, { showLevelLabels: true });
        const r = this._region(sw, sh);
        const objects = [];
        const boxW = 120, boxH = 45, levelGap = 20;
        const rootX = r.x + (r.w - boxW) / 2;
        const rootCx = rootX + boxW / 2;
        const rootBottom = r.y + boxH;
        objects.push({
            _saId: this._id(), _saRole: 'root', _saIndex: 0,
            type: 'rectangle', x: rootX, y: r.y,
            width: boxW, height: boxH,
            fill: pal.colors[0], borderRadius: 8, strokeWidth: 0,
            text: items[0].text, textColor: pal.text, fontSize: 14,
            textAlign: 'center', fontWeight: '700'
        });
        objects.push({
            _saId: this._id(), _saRole: 'level-label', _saIndex: 0,
            type: 'text', x: r.x, y: r.y, width: 60, height: boxH,
            text: 'Level 1', textColor: pal.connector, fontSize: 10,
            textAlign: 'center', fontWeight: '600', fill: 'transparent', strokeWidth: 0
        });
        const children = items.slice(1);
        const perRow = Math.min(4, children.length);
        const rows = [];
        for (let i = 0; i < children.length; i += perRow) rows.push(children.slice(i, i + perRow));
        // Pre-compute row positions
        const rowPos = rows.map((row, ri) => {
            const rowW = row.length * (boxW + 16) - 16;
            const startX = r.x + (r.w - rowW) / 2;
            const yy = r.y + (ri + 1) * (boxH + levelGap);
            return row.map((item, ci) => ({
                x: startX + ci * (boxW + 16),
                y: yy,
                cx: startX + ci * (boxW + 16) + boxW / 2,
                top: yy,
                bottom: yy + boxH,
                text: item.text
            }));
        });
        // Draw connectors first so they sit behind boxes
        const draw = (parentCx, parentBottom, kid) => {
            const midY = (parentBottom + kid.top) / 2;
            objects.push({
                _saId: this._id(), _saRole: 'connector', _saIndex: -1,
                type: 'line', x: parentCx, y: parentBottom,
                width: 0, height: midY - parentBottom,
                stroke: pal.connector, strokeWidth: 2
            });
            if (parentCx !== kid.cx) {
                objects.push({
                    _saId: this._id(), _saRole: 'connector', _saIndex: -1,
                    type: 'line', x: Math.min(parentCx, kid.cx), y: midY,
                    width: Math.abs(kid.cx - parentCx), height: 0,
                    stroke: pal.connector, strokeWidth: 2
                });
            }
            objects.push({
                _saId: this._id(), _saRole: 'connector', _saIndex: -1,
                type: 'line', x: kid.cx, y: midY,
                width: 0, height: kid.top - midY,
                stroke: pal.connector, strokeWidth: 2
            });
        };
        rowPos.forEach((row, ri) => {
            if (ri === 0) {
                row.forEach(kid => draw(rootCx, rootBottom, kid));
            } else {
                const parents = rowPos[ri - 1];
                row.forEach((kid, ki) => {
                    const parent = parents[Math.min(ki, parents.length - 1)];
                    draw(parent.cx, parent.bottom, kid);
                });
            }
        });
        // Now draw level labels and child boxes
        rowPos.forEach((row, ri) => {
            const yy = row[0].y;
            objects.push({
                _saId: this._id(), _saRole: 'level-label', _saIndex: ri + 1,
                type: 'text', x: r.x, y: yy, width: 60, height: boxH,
                text: `Level ${ri + 2}`, textColor: pal.connector, fontSize: 10,
                textAlign: 'center', fontWeight: '600', fill: 'transparent', strokeWidth: 0
            });
            row.forEach((c, ci) => {
                objects.push({
                    _saId: this._id(), _saRole: 'child', _saIndex: ri * perRow + ci + 1,
                    type: 'rectangle', x: c.x, y: c.y,
                    width: boxW, height: boxH,
                    fill: pal.colors[(ri + 1) % pal.colors.length],
                    borderRadius: 8, strokeWidth: 0,
                    text: c.text, textColor: pal.text, fontSize: 12,
                    textAlign: 'center', fontWeight: '500'
                });
            });
        });
        return { objects, connections: [] };
    }

    _genTreeChart(items, pal, sw, sh) {
        if (this._hasImportedHierarchy(items)) return this._genImportedHierarchy(items, pal, sw, sh);
        const r = this._region(sw, sh);
        const objects = [];
        const boxW = 120, boxH = 40;
        const rootX = r.x + (r.w - boxW) / 2;
        const rootCx = rootX + boxW / 2;
        const rootBottom = r.y + boxH;
        const children = items.slice(1);
        const midPoint = Math.ceil(children.length / 2);
        const level1 = children.slice(0, midPoint);
        const level2 = children.slice(midPoint);
        const l1W = level1.length * (boxW + 20) - 20;
        const l1X = r.x + (r.w - l1W) / 2;
        const l1Y = r.y + boxH + 50;
        const l1Centers = level1.map((_, i) => ({
            x: l1X + i * (boxW + 20),
            cx: l1X + i * (boxW + 20) + boxW / 2,
            top: l1Y,
            bottom: l1Y + boxH
        }));
        const l2Y = l1Y + boxH + 50;
        const l2W = level2.length * (boxW + 20) - 20;
        const l2X = r.x + (r.w - l2W) / 2;
        const l2Centers = level2.map((_, i) => ({
            x: l2X + i * (boxW + 20),
            cx: l2X + i * (boxW + 20) + boxW / 2,
            top: l2Y,
            bottom: l2Y + boxH
        }));
        // Connectors first (behind boxes)
        const linkSegs = (parentCx, parentBottom, kid) => {
            const midY = (parentBottom + kid.top) / 2;
            objects.push({
                _saId: this._id(), _saRole: 'connector', _saIndex: -1,
                type: 'line', x: parentCx, y: parentBottom,
                width: 0, height: midY - parentBottom,
                stroke: pal.connector, strokeWidth: 2
            });
            if (parentCx !== kid.cx) {
                objects.push({
                    _saId: this._id(), _saRole: 'connector', _saIndex: -1,
                    type: 'line', x: Math.min(parentCx, kid.cx), y: midY,
                    width: Math.abs(kid.cx - parentCx), height: 0,
                    stroke: pal.connector, strokeWidth: 2
                });
            }
            objects.push({
                _saId: this._id(), _saRole: 'connector', _saIndex: -1,
                type: 'line', x: kid.cx, y: midY,
                width: 0, height: kid.top - midY,
                stroke: pal.connector, strokeWidth: 2
            });
        };
        l1Centers.forEach(kid => linkSegs(rootCx, rootBottom, kid));
        l2Centers.forEach((kid, i) => {
            const parent = l1Centers[Math.min(i, l1Centers.length - 1)] || { cx: rootCx, bottom: rootBottom };
            linkSegs(parent.cx, parent.bottom, kid);
        });
        // Now draw root + child boxes
        objects.push({
            _saId: this._id(), _saRole: 'root', _saIndex: 0,
            type: 'rectangle', x: rootX, y: r.y,
            width: boxW, height: boxH,
            fill: pal.colors[0], borderRadius: 20, strokeWidth: 0,
            text: items[0].text, textColor: pal.text, fontSize: 13,
            textAlign: 'center', fontWeight: '700'
        });
        level1.forEach((item, i) => {
            objects.push({
                _saId: this._id(), _saRole: 'child', _saIndex: i + 1,
                type: 'rectangle', x: l1Centers[i].x, y: l1Y,
                width: boxW, height: boxH,
                fill: pal.colors[1 % pal.colors.length],
                borderRadius: 20, strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: 12,
                textAlign: 'center', fontWeight: '500'
            });
        });
        level2.forEach((item, i) => {
            objects.push({
                _saId: this._id(), _saRole: 'child', _saIndex: midPoint + i + 1,
                type: 'rectangle', x: l2Centers[i].x, y: l2Y,
                width: boxW, height: boxH,
                fill: pal.colors[2 % pal.colors.length],
                borderRadius: 20, strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: 12,
                textAlign: 'center', fontWeight: '500'
            });
        });
        return { objects, connections: [] };
    }

    _genHalfCircleOrg(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const cx = r.x + r.w / 2;
        const objects = [];
        const hubR = 45;
        const hubCy = r.y + hubR;
        const children = items.slice(1);
        const arcRadius = Math.min(r.w * 0.4, r.h * 0.55);
        const nodeR = Math.min(40, arcRadius * 0.3);
        // Pre-compute child centers, then draw spokes BEHIND nodes
        const childCenters = children.map((_, i) => {
            const angle = Math.PI * (i + 0.5) / children.length;
            return {
                cx: cx + Math.cos(Math.PI - angle) * arcRadius,
                cy: r.y + hubR * 2 + 20 + Math.sin(angle) * arcRadius * 0.7
            };
        });
        childCenters.forEach((c, i) => {
            const dx = c.cx - cx;
            const dy = c.cy - hubCy;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const ux = dx / len, uy = dy / len;
            const sx = cx + ux * hubR;
            const sy = hubCy + uy * hubR;
            const ex = c.cx - ux * nodeR;
            const ey = c.cy - uy * nodeR;
            objects.push({
                _saId: this._id(), _saRole: 'spoke', _saIndex: i + 1,
                type: 'line', x: sx, y: sy,
                width: ex - sx, height: ey - sy,
                stroke: pal.connector, strokeWidth: 2
            });
        });
        objects.push({
            _saId: this._id(), _saRole: 'hub', _saIndex: 0,
            type: 'circle', x: cx - hubR, y: r.y,
            width: hubR * 2, height: hubR * 2,
            fill: pal.colors[0], strokeWidth: 0,
            text: items[0].text, textColor: pal.text, fontSize: 13,
            textAlign: 'center', fontWeight: '700'
        });
        children.forEach((item, i) => {
            const c = childCenters[i];
            objects.push({
                _saId: this._id(), _saRole: 'child', _saIndex: i + 1,
                type: 'circle', x: c.cx - nodeR, y: c.cy - nodeR,
                width: nodeR * 2, height: nodeR * 2,
                fill: pal.colors[(i + 1) % pal.colors.length], strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: Math.min(11, nodeR * 0.3),
                textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    // ---- Additional RELATIONSHIP generators ----

    _genBalance(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const cx = r.x + r.w / 2;
        const beamW = r.w * 0.7;
        const beamH = 8;
        const beamY = r.y + r.h * 0.45;
        const objects = [];
        objects.push({
            _saId: this._id(), _saRole: 'fulcrum', _saIndex: -1,
            type: 'triangle', x: cx - 25, y: beamY + beamH,
            width: 50, height: 40,
            fill: pal.connector, strokeWidth: 0
        });
        objects.push({
            _saId: this._id(), _saRole: 'beam', _saIndex: -1,
            type: 'rectangle', x: cx - beamW / 2, y: beamY,
            width: beamW, height: beamH,
            fill: pal.colors[2] || pal.connector,
            borderRadius: 4, strokeWidth: 0
        });
        const panW = r.w * 0.28, panH = r.h * 0.3;
        objects.push({
            _saId: this._id(), _saRole: 'side', _saIndex: 0,
            type: 'rectangle', x: cx - beamW / 2, y: beamY - panH - 6,
            width: panW, height: panH,
            fill: pal.colors[0], borderRadius: 10, strokeWidth: 0,
            text: items[0].text, textColor: pal.text, fontSize: 16,
            textAlign: 'center', fontWeight: '700'
        });
        objects.push({
            _saId: this._id(), _saRole: 'side', _saIndex: 1,
            type: 'rectangle', x: cx + beamW / 2 - panW, y: beamY - panH - 6,
            width: panW, height: panH,
            fill: pal.colors[1], borderRadius: 10, strokeWidth: 0,
            text: items[1].text, textColor: pal.text, fontSize: 16,
            textAlign: 'center', fontWeight: '700'
        });
        return { objects, connections: [] };
    }

    _genNested(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        items.forEach((item, i) => {
            const pad = i * 30;
            const alphaVal = Math.round(200 - i * 40);
            const hex = Math.max(30, alphaVal).toString(16).padStart(2, '0');
            objects.push({
                _saId: this._id(), _saRole: 'nest', _saIndex: i,
                type: 'rectangle', x: r.x + pad, y: r.y + pad,
                width: r.w - pad * 2, height: r.h - pad * 2,
                fill: pal.colors[i % pal.colors.length] + hex,
                borderRadius: Math.max(4, 14 - i * 2),
                strokeWidth: 2, stroke: pal.colors[i % pal.colors.length],
                text: item.text, textColor: pal.text === '#ffffff' ? '#ffffff' : '#333333',
                fontSize: Math.max(11, 18 - i * 2), textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    // ---- Additional MATRIX generators ----

    _genGridMatrix(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 8;
        const cols = 3, rows = 3;
        const cellW = (r.w - gap * (cols - 1)) / cols;
        const cellH = (r.h - gap * (rows - 1)) / rows;
        const objects = [];
        for (let i = 0; i < 9 && i < items.length; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            objects.push({
                _saId: this._id(), _saRole: 'cell', _saIndex: i,
                type: 'rectangle', x: r.x + col * (cellW + gap), y: r.y + row * (cellH + gap),
                width: cellW, height: cellH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 8, strokeWidth: 0,
                text: items[i].text, textColor: pal.text, fontSize: Math.min(14, cellW * 0.12),
                textAlign: 'center', fontWeight: '600'
            });
        }
        return { objects, connections: [] };
    }

    _genTitledMatrix(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 6;
        const headerH = 32, headerW = 80;
        const cellW = (r.w - headerW - gap) / 2;
        const cellH = (r.h - headerH - gap) / 2;
        const objects = [];
        objects.push({
            _saId: this._id(), _saRole: 'header', _saIndex: -1,
            type: 'rectangle', x: r.x + headerW + gap, y: r.y,
            width: cellW, height: headerH,
            fill: pal.colors[4] || pal.connector, borderRadius: 6, strokeWidth: 0,
            text: 'Category A', textColor: pal.text, fontSize: 11,
            textAlign: 'center', fontWeight: '700'
        });
        objects.push({
            _saId: this._id(), _saRole: 'header', _saIndex: -1,
            type: 'rectangle', x: r.x + headerW + gap + cellW + gap, y: r.y,
            width: cellW, height: headerH,
            fill: pal.colors[5] || pal.connector, borderRadius: 6, strokeWidth: 0,
            text: 'Category B', textColor: pal.text, fontSize: 11,
            textAlign: 'center', fontWeight: '700'
        });
        objects.push({
            _saId: this._id(), _saRole: 'header', _saIndex: -1,
            type: 'rectangle', x: r.x, y: r.y + headerH + gap,
            width: headerW, height: cellH,
            fill: pal.colors[6] || pal.connector, borderRadius: 6, strokeWidth: 0,
            text: 'Row 1', textColor: pal.text, fontSize: 11,
            textAlign: 'center', fontWeight: '700'
        });
        objects.push({
            _saId: this._id(), _saRole: 'header', _saIndex: -1,
            type: 'rectangle', x: r.x, y: r.y + headerH + gap + cellH + gap,
            width: headerW, height: cellH,
            fill: pal.colors[7] || pal.connector, borderRadius: 6, strokeWidth: 0,
            text: 'Row 2', textColor: pal.text, fontSize: 11,
            textAlign: 'center', fontWeight: '700'
        });
        const positions = [[0,0],[1,0],[0,1],[1,1]];
        items.forEach((item, i) => {
            if (i >= 4) return;
            const [col, row] = positions[i];
            objects.push({
                _saId: this._id(), _saRole: 'cell', _saIndex: i,
                type: 'rectangle',
                x: r.x + headerW + gap + col * (cellW + gap),
                y: r.y + headerH + gap + row * (cellH + gap),
                width: cellW, height: cellH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 8, strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: Math.min(15, cellW * 0.1),
                textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    // ---- Additional PYRAMID generators ----

    _genSegmentedPyramid(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 4;
        const layerH = (r.h - gap * (items.length - 1)) / items.length;
        const tipW = r.w * 0.15;
        const objects = [];
        items.forEach((item, i) => {
            const ratio = (i + 1) / items.length;
            const layerW = tipW + (r.w - tipW) * ratio;
            const xOff = (r.w - layerW) / 2;
            objects.push({
                _saId: this._id(), _saRole: 'segment', _saIndex: i,
                type: 'rectangle', x: r.x + xOff, y: r.y + i * (layerH + gap),
                width: layerW, height: layerH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 6, strokeWidth: 1, stroke: '#ffffff33',
                text: item.text, textColor: pal.text, fontSize: Math.min(15, layerH * 0.4),
                textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genStepPyramid(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const n = items.length;
        const stepH = r.h / n;
        const objects = [];
        items.forEach((item, i) => {
            const ratio = (n - i) / n;
            const stepW = r.w * ratio;
            const xOff = (r.w - stepW) / 2;
            objects.push({
                _saId: this._id(), _saRole: 'shadow', _saIndex: i,
                type: 'rectangle', x: r.x + xOff + 4, y: r.y + (n - 1 - i) * stepH + 4,
                width: stepW, height: stepH - 2,
                fill: '#00000022', borderRadius: 4, strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'step', _saIndex: i,
                type: 'rectangle', x: r.x + xOff, y: r.y + (n - 1 - i) * stepH,
                width: stepW, height: stepH - 2,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 4, strokeWidth: 0,
                text: item.text, textColor: pal.text, fontSize: Math.min(15, stepH * 0.35),
                textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    // ---- Additional PICTURE generators ----

    _genPictureAccentList(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 14;
        const rowH = (r.h - gap * (items.length - 1)) / items.length;
        const imgSize = Math.min(rowH, r.w * 0.25);
        const objects = [];
        items.forEach((item, i) => {
            const yy = r.y + i * (rowH + gap);
            objects.push({
                _saId: this._id(), _saRole: 'image', _saIndex: i,
                type: 'rectangle', x: r.x, y: yy + (rowH - imgSize) / 2,
                width: imgSize, height: imgSize,
                fill: pal.colors[i % pal.colors.length] + '44',
                borderRadius: 10, strokeWidth: 1, stroke: pal.colors[i % pal.colors.length],
                text: '\uD83D\uDDBC', fontSize: Math.min(28, imgSize * 0.4), textAlign: 'center'
            });
            objects.push({
                _saId: this._id(), _saRole: 'caption', _saIndex: i,
                type: 'rectangle', x: r.x + imgSize + 14, y: yy,
                width: r.w - imgSize - 14, height: rowH,
                fill: pal.bg === '#ffffff' ? '#f5f5f5' : '#22223c',
                borderRadius: 8, strokeWidth: 0,
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: Math.min(15, rowH * 0.3), textAlign: 'left', fontWeight: '500'
            });
        });
        return { objects, connections: [] };
    }

    _genPictureLineup(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 16;
        const cardW = (r.w - gap * (items.length - 1)) / items.length;
        const cardH = r.h * 0.85;
        const imgH = cardH * 0.55;
        const nameH = 30;
        const yy = r.y + (r.h - cardH) / 2;
        const objects = [];
        items.forEach((item, i) => {
            const cx = r.x + i * (cardW + gap);
            objects.push({
                _saId: this._id(), _saRole: 'card', _saIndex: i,
                type: 'rectangle', x: cx, y: yy,
                width: cardW, height: cardH,
                fill: pal.bg === '#ffffff' ? '#ffffff' : '#1e1e34',
                borderRadius: 12, strokeWidth: 1, stroke: pal.colors[i % pal.colors.length] + '66'
            });
            const circR = Math.min(cardW - 20, imgH - 10) * 0.45;
            objects.push({
                _saId: this._id(), _saRole: 'image', _saIndex: i,
                type: 'circle', x: cx + (cardW - circR * 2) / 2, y: yy + 10,
                width: circR * 2, height: circR * 2,
                fill: pal.colors[i % pal.colors.length] + '33',
                strokeWidth: 2, stroke: pal.colors[i % pal.colors.length],
                text: '\uD83D\uDDBC', fontSize: Math.min(24, circR * 0.5), textAlign: 'center'
            });
            objects.push({
                _saId: this._id(), _saRole: 'caption', _saIndex: i,
                type: 'text', x: cx + 4, y: yy + imgH + 8,
                width: cardW - 8, height: nameH,
                text: item.text, textColor: pal.text === '#ffffff' ? '#dddddd' : '#222222',
                fontSize: Math.min(14, cardW * 0.12), textAlign: 'center', fontWeight: '700',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genPictureShowcase(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 10;
        const mainW = r.w * 0.55;
        const thumbW = r.w - mainW - gap;
        const objects = [];
        objects.push({
            _saId: this._id(), _saRole: 'image', _saIndex: 0,
            type: 'rectangle', x: r.x, y: r.y,
            width: mainW, height: r.h * 0.8,
            fill: pal.colors[0] + '44',
            borderRadius: 12, strokeWidth: 1, stroke: pal.colors[0],
            text: '\uD83D\uDDBC', fontSize: 48, textAlign: 'center'
        });
        objects.push({
            _saId: this._id(), _saRole: 'caption', _saIndex: 0,
            type: 'text', x: r.x, y: r.y + r.h * 0.82,
            width: mainW, height: r.h * 0.18,
            text: items[0].text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
            fontSize: 16, textAlign: 'center', fontWeight: '700',
            fill: 'transparent', strokeWidth: 0
        });
        const thumbItems = items.slice(1);
        const thumbH = (r.h - gap * (thumbItems.length - 1)) / thumbItems.length;
        thumbItems.forEach((item, i) => {
            const ty = r.y + i * (thumbH + gap);
            objects.push({
                _saId: this._id(), _saRole: 'image', _saIndex: i + 1,
                type: 'rectangle', x: r.x + mainW + gap, y: ty,
                width: thumbW, height: thumbH * 0.7,
                fill: pal.colors[(i + 1) % pal.colors.length] + '44',
                borderRadius: 8, strokeWidth: 1, stroke: pal.colors[(i + 1) % pal.colors.length],
                text: '\uD83D\uDDBC', fontSize: 20, textAlign: 'center'
            });
            objects.push({
                _saId: this._id(), _saRole: 'caption', _saIndex: i + 1,
                type: 'text', x: r.x + mainW + gap, y: ty + thumbH * 0.72,
                width: thumbW, height: thumbH * 0.28,
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: 11, textAlign: 'center', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    // ======= INFOGRAPHIC generators =======

    _genMilestoneTimeline(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const vertical = this._flowDirection === 'vertical';
        const objects = [];
        if (vertical) {
            const lineX = r.x + r.w * 0.5;
            objects.push({
                _saId: this._id(), _saRole: 'timeline-base', _saIndex: -1,
                type: 'line', x: lineX, y: r.y, width: 0, height: r.h,
                stroke: pal.connector, strokeWidth: 3
            });
            const labelW = (r.w / 2) - 24;
            items.forEach((item, i) => {
                const yPos = r.y + (r.h * (i + 0.5) / items.length);
                const right = i % 2 === 0;
                objects.push({
                    _saId: this._id(), _saRole: 'milestone', _saIndex: i,
                    type: 'circle', x: lineX - 10, y: yPos - 10,
                    width: 20, height: 20,
                    fill: pal.colors[i % pal.colors.length],
                    strokeWidth: 3, stroke: '#ffffff'
                });
                const lh = Math.min((r.h / items.length) - 8, 50);
                const lx = right ? lineX + 18 : r.x;
                objects.push({
                    _saId: this._id(), _saRole: 'label', _saIndex: i,
                    type: 'text', x: lx, y: yPos - lh / 2,
                    width: labelW, height: lh,
                    text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                    fontSize: Math.min(13, labelW * 0.11),
                    textAlign: right ? 'left' : 'right', fontWeight: '600',
                    fill: 'transparent', strokeWidth: 0
                });
            });
            return { objects, connections: [] };
        }
        const lineY = r.y + r.h * 0.55;
        objects.push({
            _saId: this._id(), _saRole: 'timeline-base', _saIndex: -1,
            type: 'line', x: r.x, y: lineY, width: r.w, height: 0,
            stroke: pal.connector, strokeWidth: 3
        });
        items.forEach((item, i) => {
            const xPos = r.x + (r.w * (i + 0.5) / items.length);
            const above = i % 2 === 0;
            objects.push({
                _saId: this._id(), _saRole: 'milestone', _saIndex: i,
                type: 'circle', x: xPos - 10, y: lineY - 10,
                width: 20, height: 20,
                fill: pal.colors[i % pal.colors.length],
                strokeWidth: 3, stroke: '#ffffff'
            });
            const lw = r.w / items.length - 10;
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: xPos - lw / 2, y: above ? lineY - 60 : lineY + 25,
                width: lw, height: 40,
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: Math.min(13, lw * 0.15), textAlign: 'center', fontWeight: '600',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genRadialProgress(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const cols = Math.min(items.length, 3);
        const rows = Math.ceil(items.length / cols);
        const cellW = r.w / cols;
        const cellH = r.h / rows;
        const rad = Math.min(cellW, cellH) * 0.3;
        const objects = [];
        items.forEach((item, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = r.x + col * cellW + cellW / 2;
            const cy = r.y + row * cellH + cellH * 0.4;
            objects.push({
                _saId: this._id(), _saRole: 'ring-bg', _saIndex: i,
                type: 'circle', x: cx - rad, y: cy - rad,
                width: rad * 2, height: rad * 2,
                fill: pal.colors[i % pal.colors.length] + '30',
                strokeWidth: 6, stroke: pal.colors[i % pal.colors.length] + '40'
            });
            objects.push({
                _saId: this._id(), _saRole: 'ring', _saIndex: i,
                type: 'circle', x: cx - rad * 0.65, y: cy - rad * 0.65,
                width: rad * 1.3, height: rad * 1.3,
                fill: pal.colors[i % pal.colors.length],
                strokeWidth: 0,
                text: this._getItemSecondaryValue(item, `${60 + i * 8}%`), textColor: '#ffffff',
                fontSize: Math.min(18, rad * 0.45), textAlign: 'center', fontWeight: '700'
            });
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: cx - cellW * 0.4, y: cy + rad + 8,
                width: cellW * 0.8, height: 24,
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: 11, textAlign: 'center', fontWeight: '600',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genProgressBars(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 12;
        const barH = Math.min(30, (r.h - gap * (items.length - 1)) / items.length * 0.5);
        const rowH = (r.h - gap * (items.length - 1)) / items.length;
        const objects = [];
        items.forEach((item, i) => {
            const yy = r.y + i * (rowH + gap);
            const pct = Math.round(this._getItemRatio(item, (40 + (i * 12) % 55) / 100) * 100);
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: r.x, y: yy,
                width: r.w * 0.25, height: barH,
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: 12, textAlign: 'left', fontWeight: '600',
                fill: 'transparent', strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'bar-bg', _saIndex: i,
                type: 'rectangle', x: r.x + r.w * 0.27, y: yy + 2,
                width: r.w * 0.63, height: barH - 4,
                fill: pal.colors[i % pal.colors.length] + '25',
                borderRadius: barH / 2, strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'bar', _saIndex: i,
                type: 'rectangle', x: r.x + r.w * 0.27, y: yy + 2,
                width: r.w * 0.63 * (pct / 100), height: barH - 4,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: barH / 2, strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'value', _saIndex: i,
                type: 'text', x: r.x + r.w * 0.92, y: yy,
                width: r.w * 0.08, height: barH,
                text: pct + '%', textColor: pal.colors[i % pal.colors.length],
                fontSize: 11, textAlign: 'right', fontWeight: '700',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genStepCounter(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const stepW = r.w / items.length;
        const circR = Math.min(28, stepW * 0.25);
        const objects = [];
        // Connecting line
        objects.push({
            _saId: this._id(), _saRole: 'connector', _saIndex: -1,
            type: 'line', x: r.x + stepW / 2, y: r.y + r.h * 0.35,
            width: r.w - stepW, height: 0,
            stroke: pal.connector, strokeWidth: 3
        });
        items.forEach((item, i) => {
            const cx = r.x + stepW * (i + 0.5);
            const cy = r.y + r.h * 0.35;
            objects.push({
                _saId: this._id(), _saRole: 'step-circle', _saIndex: i,
                type: 'circle', x: cx - circR, y: cy - circR,
                width: circR * 2, height: circR * 2,
                fill: pal.colors[i % pal.colors.length],
                strokeWidth: 3, stroke: '#ffffff',
                text: String(i + 1), textColor: '#ffffff',
                fontSize: Math.min(16, circR * 0.8), textAlign: 'center', fontWeight: '700'
            });
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: cx - stepW * 0.4, y: cy + circR + 14,
                width: stepW * 0.8, height: 40,
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: Math.min(12, stepW * 0.12), textAlign: 'center', fontWeight: '600',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genStatsDashboard(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const cols = Math.min(items.length, items.length <= 3 ? 3 : 2);
        const rows = Math.ceil(items.length / cols);
        const gap = 14;
        const cw = (r.w - gap * (cols - 1)) / cols;
        const ch = (r.h - gap * (rows - 1)) / rows;
        const objects = [];
        items.forEach((item, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const bx = r.x + col * (cw + gap);
            const by = r.y + row * (ch + gap);
            objects.push({
                _saId: this._id(), _saRole: 'card', _saIndex: i,
                type: 'rectangle', x: bx, y: by, width: cw, height: ch,
                fill: pal.colors[i % pal.colors.length] + '18',
                borderRadius: 12, strokeWidth: 2,
                stroke: pal.colors[i % pal.colors.length] + '40'
            });
            objects.push({
                _saId: this._id(), _saRole: 'value', _saIndex: i,
                type: 'text', x: bx + 10, y: by + ch * 0.15,
                width: cw - 20, height: ch * 0.45,
                text: this._getItemSecondaryValue(item, `${(i + 1) * 247}`), textColor: pal.colors[i % pal.colors.length],
                fontSize: Math.min(32, ch * 0.3), textAlign: 'center', fontWeight: '700',
                fill: 'transparent', strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: bx + 10, y: by + ch * 0.6,
                width: cw - 20, height: ch * 0.3,
                text: item.text, textColor: pal.text === '#ffffff' ? '#aaaaaa' : '#666666',
                fontSize: Math.min(13, cw * 0.1), textAlign: 'center', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genComparisonInfographic(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const halfW = (r.w - 20) / 2;
        const objects = [];
        // VS divider
        objects.push({
            _saId: this._id(), _saRole: 'divider', _saIndex: -1,
            type: 'circle', x: r.x + r.w / 2 - 22, y: r.y + r.h / 2 - 22,
            width: 44, height: 44,
            fill: pal.connector, strokeWidth: 0,
            text: 'VS', textColor: '#ffffff',
            fontSize: 14, textAlign: 'center', fontWeight: '700'
        });
        items.forEach((item, i) => {
            const bx = i === 0 ? r.x : r.x + halfW + 20;
            objects.push({
                _saId: this._id(), _saRole: 'card', _saIndex: i,
                type: 'rectangle', x: bx, y: r.y, width: halfW, height: r.h,
                fill: pal.colors[i % pal.colors.length] + '15',
                borderRadius: 14, strokeWidth: 2,
                stroke: pal.colors[i % pal.colors.length]
            });
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: bx + 10, y: r.y + r.h * 0.35,
                width: halfW - 20, height: r.h * 0.3,
                text: item.text, textColor: pal.colors[i % pal.colors.length],
                fontSize: Math.min(22, halfW * 0.12), textAlign: 'center', fontWeight: '700',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genChecklist(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 8;
        const rowH = (r.h - gap * (items.length - 1)) / items.length;
        const checkS = Math.min(22, rowH * 0.6);
        const objects = [];
        items.forEach((item, i) => {
            const yy = r.y + i * (rowH + gap);
            objects.push({
                _saId: this._id(), _saRole: 'check', _saIndex: i,
                type: 'rectangle', x: r.x, y: yy + (rowH - checkS) / 2,
                width: checkS, height: checkS,
                fill: i < items.length / 2 ? pal.colors[i % pal.colors.length] : 'transparent',
                borderRadius: 4, strokeWidth: 2,
                stroke: pal.colors[i % pal.colors.length],
                text: i < items.length / 2 ? '✓' : '', textColor: '#ffffff',
                fontSize: checkS * 0.6, textAlign: 'center', fontWeight: '700'
            });
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: r.x + checkS + 14, y: yy,
                width: r.w - checkS - 14, height: rowH,
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: Math.min(14, rowH * 0.45), textAlign: 'left', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genRoadmap(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const rowH = r.h / items.length;
        items.forEach((item, i) => {
            const left = i % 2 === 0;
            const markerX = r.x + r.w * 0.5;
            const yy = r.y + i * rowH + rowH / 2;
            // Vertical connector
            if (i < items.length - 1) {
                objects.push({
                    _saId: this._id(), _saRole: 'connector', _saIndex: i,
                    type: 'line', x: markerX, y: yy, width: 0, height: rowH,
                    stroke: pal.connector, strokeWidth: 3
                });
            }
            // Marker
            objects.push({
                _saId: this._id(), _saRole: 'marker', _saIndex: i,
                type: 'circle', x: markerX - 12, y: yy - 12,
                width: 24, height: 24,
                fill: pal.colors[i % pal.colors.length],
                strokeWidth: 3, stroke: '#ffffff'
            });
            // Card
            const cardW = r.w * 0.35;
            const cardX = left ? r.x + r.w * 0.08 : r.x + r.w * 0.57;
            objects.push({
                _saId: this._id(), _saRole: 'card', _saIndex: i,
                type: 'rectangle', x: cardX, y: yy - rowH * 0.3,
                width: cardW, height: rowH * 0.6,
                fill: pal.colors[i % pal.colors.length] + '18',
                borderRadius: 10, strokeWidth: 1,
                stroke: pal.colors[i % pal.colors.length],
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: Math.min(13, cardW * 0.08), textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    // ======= DATA VISUALIZATION generators =======

    _genBarChart(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const textColor = pal.text === '#ffffff' ? '#cccccc' : '#333333';
        const titles = this._chartAxisTitles();
        // Reserve top space for value-axis title if we have one.
        const topPad = titles.valueTitle ? 28 : 20;
        const bottomPad = titles.categoryTitle ? 80 : 50;
        const barArea = { x: r.x + 50, y: r.y + topPad, w: r.w - 60, h: r.h - topPad - bottomPad };
        const barW = (barArea.w - 10 * (items.length - 1)) / items.length;
        // Use real numeric values when present so the axis scale is meaningful;
        // fall back to ratio-based heights when items only carry text.
        const range = this._chartValueRange(items);
        // Y axis
        objects.push({
            _saId: this._id(), _saRole: 'axis-y', _saIndex: -1,
            type: 'line', x: barArea.x, y: barArea.y, width: 0, height: barArea.h,
            stroke: pal.connector, strokeWidth: 2
        });
        // X axis
        objects.push({
            _saId: this._id(), _saRole: 'axis-x', _saIndex: -1,
            type: 'line', x: barArea.x, y: barArea.y + barArea.h, width: barArea.w, height: 0,
            stroke: pal.connector, strokeWidth: 2
        });
        objects.push(...this._renderChartFurniture({
            plotArea: barArea,
            valueMin: range.min, valueMax: range.max,
            pal, textColor, valueAxis: 'y',
            suffix: titles.suffix,
            valueTitle: titles.valueTitle,
            categoryTitle: titles.categoryTitle
        }));
        items.forEach((item, i) => {
            const numeric = this._getItemNumericValue(item, null);
            let pct;
            if (range.hasReal && numeric != null) {
                pct = (numeric - range.min) / (range.max - range.min);
            } else {
                pct = this._getItemRatio(item, (0.3 + (i * 0.15)) % 1.0);
            }
            const barH = barArea.h * Math.max(range.hasReal ? 0 : 0.15, pct);
            const bx = barArea.x + 5 + i * (barW + 10);
            const by = barArea.y + barArea.h - barH;
            objects.push({
                _saId: this._id(), _saRole: 'bar', _saIndex: i,
                type: 'rectangle', x: bx, y: by, width: barW, height: barH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 4, strokeWidth: 0
            });
            const valueLabel = range.hasReal && numeric != null
                ? this._formatChartTick(numeric) + (titles.suffix || '')
                : this._getItemSecondaryValue(item, String(Math.round(pct * 100)));
            objects.push({
                _saId: this._id(), _saRole: 'value', _saIndex: i,
                type: 'text', x: bx, y: by - 18, width: barW, height: 16,
                text: valueLabel, textColor,
                fontSize: 10, textAlign: 'center', fontWeight: '600',
                fill: 'transparent', strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: bx, y: barArea.y + barArea.h + 6, width: barW, height: 22,
                text: item.text, textColor,
                fontSize: Math.min(10, barW * 0.12), textAlign: 'center', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genHorizontalBarChart(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 10;
        const objects = [];
        const textColor = pal.text === '#ffffff' ? '#cccccc' : '#333333';
        const titles = this._chartAxisTitles();
        const topPad = titles.categoryTitle ? 18 : 0;
        const bottomPad = titles.valueTitle ? 38 : 22;
        const barH = (r.h - topPad - bottomPad - gap * (items.length - 1)) / items.length;
        const labelW = r.w * 0.2;
        const plotArea = {
            x: r.x + labelW, y: r.y + topPad,
            w: r.w - labelW, h: r.h - topPad - bottomPad
        };
        const range = this._chartValueRange(items);
        // Axes
        objects.push({
            _saId: this._id(), _saRole: 'axis-y', _saIndex: -1,
            type: 'line', x: plotArea.x, y: plotArea.y, width: 0, height: plotArea.h,
            stroke: pal.connector, strokeWidth: 2
        });
        objects.push({
            _saId: this._id(), _saRole: 'axis-x', _saIndex: -1,
            type: 'line', x: plotArea.x, y: plotArea.y + plotArea.h, width: plotArea.w, height: 0,
            stroke: pal.connector, strokeWidth: 2
        });
        objects.push(...this._renderChartFurniture({
            plotArea,
            valueMin: range.min, valueMax: range.max,
            pal, textColor, valueAxis: 'x',
            suffix: titles.suffix,
            valueTitle: titles.valueTitle,
            categoryTitle: titles.categoryTitle
        }));
        items.forEach((item, i) => {
            const yy = plotArea.y + i * (barH + gap);
            const numeric = this._getItemNumericValue(item, null);
            const pct = (range.hasReal && numeric != null)
                ? (numeric - range.min) / (range.max - range.min)
                : this._getItemRatio(item, (0.4 + (i * 0.13)) % 0.95);
            const trackX = plotArea.x;
            const trackW = plotArea.w;
            const fillW = trackW * pct;
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: r.x, y: yy, width: labelW - 8, height: barH,
                text: item.text, textColor,
                fontSize: Math.min(12, barH * 0.4), textAlign: 'right', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'bar', _saIndex: i,
                type: 'rectangle', x: trackX, y: yy + barH * 0.15,
                width: fillW, height: barH * 0.7,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: barH * 0.15, strokeWidth: 0
            });
            // Value label — positioned just past the bar end when there is room,
            // otherwise inside the right edge of the bar so it never overflows
            // the chart area for very long values.
            const valueText = (range.hasReal && numeric != null)
                ? this._formatChartTick(numeric) + (titles.suffix || '')
                : this._getItemSecondaryValue(item, String(Math.round(pct * 100)));
            const valueFontSize = Math.min(11, barH * 0.38);
            const approxValueW = Math.max(28, valueText.length * valueFontSize * 0.6);
            const fitsOutside = (trackX + fillW + 6 + approxValueW) <= (r.x + r.w);
            const valueX = fitsOutside
                ? trackX + fillW + 6
                : Math.max(trackX + 4, trackX + fillW - approxValueW - 4);
            const insideBar = !fitsOutside;
            objects.push({
                _saId: this._id(), _saRole: 'value', _saIndex: i,
                type: 'text', x: valueX, y: yy + barH * 0.15,
                width: approxValueW, height: barH * 0.7,
                text: valueText,
                textColor: insideBar ? '#ffffff' : textColor,
                fontSize: valueFontSize, textAlign: 'left', fontWeight: '600',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genDonutChart(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const cx = r.x + r.w * 0.4;
        const cy = r.y + r.h / 2;
        const outerR = Math.min(r.w * 0.35, r.h * 0.4);
        const innerR = outerR * 0.55;
        const objects = [];
        // Outer ring
        objects.push({
            _saId: this._id(), _saRole: 'ring', _saIndex: -1,
            type: 'circle', x: cx - outerR, y: cy - outerR,
            width: outerR * 2, height: outerR * 2,
            fill: pal.colors[0] + '30', strokeWidth: 0
        });
        // Inner hole (white)
        objects.push({
            _saId: this._id(), _saRole: 'inner', _saIndex: -1,
            type: 'circle', x: cx - innerR, y: cy - innerR,
            width: innerR * 2, height: innerR * 2,
            fill: pal.bg || '#ffffff', strokeWidth: 0,
            text: 'Total', textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
            fontSize: 14, textAlign: 'center', fontWeight: '700'
        });
        // Segment indicators on the right
        const legendX = r.x + r.w * 0.65;
        const legendItemH = Math.min(40, r.h / items.length);
        const legendStartY = cy - (items.length * legendItemH) / 2;
        items.forEach((item, i) => {
            objects.push({
                _saId: this._id(), _saRole: 'legend-dot', _saIndex: i,
                type: 'circle', x: legendX, y: legendStartY + i * legendItemH + legendItemH / 2 - 6,
                width: 12, height: 12,
                fill: pal.colors[i % pal.colors.length], strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'legend', _saIndex: i,
                type: 'text', x: legendX + 18, y: legendStartY + i * legendItemH,
                width: r.w * 0.3, height: legendItemH,
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: 12, textAlign: 'left', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genHeatMap(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 4;
        const cols = 3, rows = 3;
        const cw = (r.w - gap * (cols - 1)) / cols;
        const ch = (r.h - gap * (rows - 1)) / rows;
        const objects = [];
        items.forEach((item, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const intensity = 0.2 + (((i * 3 + 1) % 9) / 9) * 0.8;
            const color = pal.colors[Math.floor(intensity * (pal.colors.length - 1)) % pal.colors.length];
            objects.push({
                _saId: this._id(), _saRole: 'cell', _saIndex: i,
                type: 'rectangle',
                x: r.x + col * (cw + gap), y: r.y + row * (ch + gap),
                width: cw, height: ch,
                fill: color, borderRadius: 6, strokeWidth: 0,
                text: item.text, textColor: '#ffffff',
                fontSize: Math.min(13, cw * 0.1), textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genTreemap(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const gap = 4;
        // Simple treemap: first item big, rest fill remaining space
        const mainW = r.w * 0.5;
        objects.push({
            _saId: this._id(), _saRole: 'block', _saIndex: 0,
            type: 'rectangle', x: r.x, y: r.y, width: mainW - gap, height: r.h,
            fill: pal.colors[0], borderRadius: 8, strokeWidth: 0,
            text: items[0].text, textColor: pal.text, fontSize: Math.min(18, mainW * 0.08),
            textAlign: 'center', fontWeight: '700'
        });
        const rest = items.slice(1);
        const restRows = Math.ceil(rest.length / 2);
        const restW = (r.w - mainW - gap) / 2;
        const restH = (r.h - gap * (restRows - 1)) / restRows;
        rest.forEach((item, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            objects.push({
                _saId: this._id(), _saRole: 'block', _saIndex: i + 1,
                type: 'rectangle',
                x: r.x + mainW + col * (restW + gap),
                y: r.y + row * (restH + gap),
                width: restW - (col < 1 ? gap : 0), height: restH,
                fill: pal.colors[(i + 1) % pal.colors.length],
                borderRadius: 6, strokeWidth: 0,
                text: item.text, textColor: pal.text,
                fontSize: Math.min(12, restW * 0.12), textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genBubbleChart(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const baseR = Math.min(r.w, r.h) * 0.15;
        items.forEach((item, i) => {
            const angle = (Math.PI * 2 * i) / items.length - Math.PI / 2;
            const dist = baseR * 1.5 + (i % 2) * baseR * 0.3;
            const bx = cx + Math.cos(angle) * dist;
            const by = cy + Math.sin(angle) * dist;
            const size = baseR * (0.6 + (i % 3) * 0.25);
            objects.push({
                _saId: this._id(), _saRole: 'bubble', _saIndex: i,
                type: 'circle', x: bx - size, y: by - size,
                width: size * 2, height: size * 2,
                fill: pal.colors[i % pal.colors.length] + 'CC',
                strokeWidth: 2, stroke: pal.colors[i % pal.colors.length],
                text: item.text, textColor: '#ffffff',
                fontSize: Math.min(12, size * 0.3), textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    // ======= MULTI-SERIES CHART HELPERS & GENERATORS =======

    // Parse comma/pipe/semicolon-separated numeric series from item.subtext.
    // Returns an array of numbers (length 0 if none parseable).
    _getItemSeriesValues(item) {
        const raw = this._getItemSecondaryValue(item, '');
        if (!raw) return [];
        return String(raw)
            .split(/[,;|]/)
            .map(seg => {
                const cleaned = seg.replace(/[^\d.\-]/g, '');
                const v = parseFloat(cleaned);
                return Number.isFinite(v) ? v : null;
            })
            .filter(v => v != null);
    }

    // Compute max series length across all items
    _seriesCount(items) {
        let n = 0;
        items.forEach(it => { n = Math.max(n, this._getItemSeriesValues(it).length); });
        return Math.max(1, n);
    }

    // Resolve series labels from the manager-supplied list (this._seriesLabels)
    // or fall back to "Series 1", "Series 2", …
    _resolveSeriesLabels(count) {
        const supplied = Array.isArray(this._seriesLabels) ? this._seriesLabels : [];
        return Array.from({ length: count }, (_, i) => supplied[i] || `Series ${i + 1}`);
    }

    // Render a horizontal legend strip of series swatches; returns objects + the y-extent used.
    // Wraps to additional rows if labels exceed maxW so legend entries never
    // overlap each other or the chart bars below.
    _renderSeriesLegend(labels, pal, x, y, maxW, textColor) {
        const objects = [];
        const dotR = 5;
        const dotW = dotR * 2;          // 10
        const dotToText = 4;            // gap between dot and text object
        const textLeftPad = 12;         // matches _drawObj: textAlign:'left' adds x + 12
        const interItem = 18;           // breathing room between adjacent legend entries
        const rowH = 18;
        const fontSize = 11;
        // Conservative per-char width for Inter / generic sans at 11px (cap height + small slack)
        const charW = 7;
        const safeMaxW = Math.max(60, maxW);
        let cx = x;
        let cy = y;
        let rows = 1;
        labels.forEach((label, i) => {
            const text = String(label || '');
            const labelTextW = Math.max(28, text.length * charW);
            const slotW = dotW + dotToText + textLeftPad + labelTextW + 6; // +6 right margin inside slot
            const itemW = slotW + interItem;
            // Wrap to next row if this entry would exceed maxW
            if (cx + slotW > x + safeMaxW && cx > x) {
                cx = x;
                cy += rowH;
                rows += 1;
            }
            objects.push({
                _saId: this._id(), _saRole: 'legend-dot', _saIndex: i,
                type: 'circle', x: cx, y: cy + 2, width: dotW, height: dotW,
                fill: pal.colors[i % pal.colors.length], strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'legend', _saIndex: i,
                type: 'text',
                x: cx + dotW + dotToText,
                y: cy - 2,
                width: slotW - dotW - dotToText,
                height: 16,
                text, textColor, fontSize, textAlign: 'left', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
            cx += itemW;
        });
        return { objects, height: rowH * rows };
    }

    // ---- Chart axis furniture (tick labels + axis titles) ----
    // Used by every numeric chart so axis labels are routinely included.

    // Compact numeric tick formatter — keeps labels short on cramped axes.
    _formatChartTick(v) {
        if (!Number.isFinite(v)) return '';
        const a = Math.abs(v);
        if (a >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
        if (a >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
        if (a >= 1e4) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
        if (a >= 100) return Math.round(v).toString();
        if (a >= 10) return v.toFixed(0);
        if (a >= 1) return v.toFixed(1).replace(/\.0$/, '');
        if (a > 0) return v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
        return '0';
    }

    // Pull axis titles from table headers stashed by SmartArtImport.
    // headers[0] is the row label column; headers[1+] are value columns.
    // Returns { categoryTitle, valueTitle, suffix } where suffix is e.g. '%'.
    _chartAxisTitles() {
        const headers = Array.isArray(this._tableHeaders) ? this._tableHeaders : [];
        if (!headers.length) return { categoryTitle: '', valueTitle: '', suffix: '' };
        const categoryTitle = headers[0] ? String(headers[0]).trim() : '';
        const valueHeaders = headers.slice(1).map(h => String(h || '').trim()).filter(Boolean);
        let valueTitle = '';
        if (valueHeaders.length === 1) valueTitle = valueHeaders[0];
        else if (valueHeaders.length > 1) {
            // Look for a common unit token across headers to use as a single title.
            const unitRx = /\b(day|days|week|weeks|month|months|year|years|hour|hours|min|mins|minute|minutes|usd|eur|gbp|ngn|%|percent|count|score|rating|qty|quantity)\b/i;
            const firstMatch = valueHeaders.map(h => h.match(unitRx)).find(m => m);
            valueTitle = firstMatch ? firstMatch[0] : 'Value';
        }
        const joined = valueHeaders.join(' ').toLowerCase() + ' ' + categoryTitle.toLowerCase();
        let suffix = '';
        if (/\b(percent|percentage)\b|%/.test(joined)) suffix = '%';
        else if (/\b(usd|dollar|dollars)\b|\$/.test(joined)) suffix = '';
        else if (/\b(day|days)\b/.test(joined)) suffix = 'd';
        else if (/\b(week|weeks)\b/.test(joined)) suffix = 'w';
        else if (/\b(month|months)\b/.test(joined)) suffix = 'mo';
        else if (/\b(year|years)\b/.test(joined)) suffix = 'y';
        else if (/\b(hour|hours)\b/.test(joined)) suffix = 'h';
        else if (/\b(min|mins|minute|minutes)\b/.test(joined)) suffix = 'm';
        // Title-case the value title for display
        if (valueTitle) {
            valueTitle = valueTitle.replace(/\b\w/g, ch => ch.toUpperCase());
        }
        return { categoryTitle, valueTitle, suffix };
    }

    // Render axis tick labels and (optionally) axis titles for a chart.
    // valueAxis = 'y' (vertical bars/lines, ticks on left) or 'x' (horizontal bars, ticks below).
    // Returns the array of objects to push (caller appends).
    _renderChartFurniture({ plotArea, valueMin = 0, valueMax = 1, pal, textColor, valueAxis = 'y', suffix = '', valueTitle = '', categoryTitle = '', tickFormatter = null }) {
        const out = [];
        const ticks = 5;
        const fmt = (v) => {
            const base = tickFormatter ? tickFormatter(v) : this._formatChartTick(v);
            return suffix ? base + suffix : base;
        };
        if (valueAxis === 'y') {
            for (let i = 0; i <= ticks; i++) {
                const t = i / ticks;
                const v = valueMin + (valueMax - valueMin) * t;
                const yy = plotArea.y + plotArea.h - t * plotArea.h;
                out.push({
                    _saId: this._id(), _saRole: 'axis-tick', _saIndex: i,
                    type: 'line', x: plotArea.x - 4, y: yy, width: 4, height: 0,
                    stroke: pal.connector, strokeWidth: 1
                });
                out.push({
                    _saId: this._id(), _saRole: 'axis-tick-label', _saIndex: i,
                    type: 'text', x: plotArea.x - 46, y: yy - 7, width: 40, height: 14,
                    text: fmt(v),
                    textColor, fontSize: 9, textAlign: 'right', fontWeight: '500',
                    fill: 'transparent', strokeWidth: 0
                });
            }
            if (valueTitle) {
                out.push({
                    _saId: this._id(), _saRole: 'axis-title-y', _saIndex: -1,
                    type: 'text',
                    x: plotArea.x - 46, y: plotArea.y - 16,
                    width: Math.max(120, plotArea.w * 0.5), height: 14,
                    text: valueTitle, textColor,
                    fontSize: 10, textAlign: 'left', fontWeight: '700',
                    fill: 'transparent', strokeWidth: 0
                });
            }
            if (categoryTitle) {
                out.push({
                    _saId: this._id(), _saRole: 'axis-title-x', _saIndex: -1,
                    type: 'text',
                    x: plotArea.x, y: plotArea.y + plotArea.h + 28,
                    width: plotArea.w, height: 14,
                    text: categoryTitle, textColor,
                    fontSize: 10, textAlign: 'center', fontWeight: '700',
                    fill: 'transparent', strokeWidth: 0
                });
            }
        } else {
            // valueAxis === 'x' — value runs along bottom (horizontal bar style)
            for (let i = 0; i <= ticks; i++) {
                const t = i / ticks;
                const v = valueMin + (valueMax - valueMin) * t;
                const xx = plotArea.x + t * plotArea.w;
                out.push({
                    _saId: this._id(), _saRole: 'axis-tick', _saIndex: i,
                    type: 'line', x: xx, y: plotArea.y + plotArea.h, width: 0, height: 4,
                    stroke: pal.connector, strokeWidth: 1
                });
                out.push({
                    _saId: this._id(), _saRole: 'axis-tick-label', _saIndex: i,
                    type: 'text', x: xx - 24, y: plotArea.y + plotArea.h + 6, width: 48, height: 12,
                    text: fmt(v),
                    textColor, fontSize: 9, textAlign: 'center', fontWeight: '500',
                    fill: 'transparent', strokeWidth: 0
                });
            }
            if (valueTitle) {
                out.push({
                    _saId: this._id(), _saRole: 'axis-title-x', _saIndex: -1,
                    type: 'text',
                    x: plotArea.x, y: plotArea.y + plotArea.h + 22,
                    width: plotArea.w, height: 14,
                    text: valueTitle, textColor,
                    fontSize: 10, textAlign: 'center', fontWeight: '700',
                    fill: 'transparent', strokeWidth: 0
                });
            }
            if (categoryTitle) {
                out.push({
                    _saId: this._id(), _saRole: 'axis-title-y', _saIndex: -1,
                    type: 'text',
                    x: plotArea.x - 60, y: plotArea.y - 16,
                    width: 160, height: 14,
                    text: categoryTitle, textColor,
                    fontSize: 10, textAlign: 'left', fontWeight: '700',
                    fill: 'transparent', strokeWidth: 0
                });
            }
        }
        return out;
    }

    // Compute a friendly numeric value range from a list of items.
    // If `seriesValuesArr` is provided, uses those numbers instead of single-value extraction.
    _chartValueRange(items, seriesValuesArr = null) {
        let min = Infinity, max = -Infinity, count = 0;
        const consider = (v) => {
            if (typeof v === 'number' && Number.isFinite(v)) {
                min = Math.min(min, v); max = Math.max(max, v); count++;
            }
        };
        if (Array.isArray(seriesValuesArr)) {
            seriesValuesArr.forEach(arr => Array.isArray(arr) && arr.forEach(consider));
        } else {
            items.forEach(it => consider(this._getItemNumericValue(it, null)));
        }
        if (count === 0) return { min: 0, max: 100, hasReal: false };
        if (min > 0) min = 0; // anchor at zero unless data goes negative
        if (max <= min) max = min + 1;
        return { min, max, hasReal: true };
    }

    // Clustered bar chart: each item is a category; series values are grouped side-by-side.
    // Honours `this._barOrientation` ('vertical' default | 'horizontal') set by the manager.
    _genClusteredBarChart(items, pal, sw, sh) {
        if (this._barOrientation === 'horizontal') {
            return this._genClusteredBarChartHorizontal(items, pal, sw, sh);
        }
        const r = this._region(sw, sh);
        const objects = [];
        const textColor = pal.text === '#ffffff' ? '#cccccc' : '#333333';
        const titles = this._chartAxisTitles();
        const seriesN = this._seriesCount(items);
        const labels = this._resolveSeriesLabels(seriesN);
        const legend = this._renderSeriesLegend(labels, pal, r.x + 50, r.y + 4, r.w - 60, textColor);
        objects.push(...legend.objects);
        const top = r.y + legend.height + 12;
        const bottomPad = titles.categoryTitle ? 80 : 50;
        const barArea = { x: r.x + 50, y: top, w: r.w - 60, h: r.h - (top - r.y) - bottomPad };
        // Find global max for scaling
        let max = 0;
        items.forEach(it => this._getItemSeriesValues(it).forEach(v => { if (v > max) max = v; }));
        if (max <= 0) max = 1;
        // Y axis
        objects.push({
            _saId: this._id(), _saRole: 'axis-y', _saIndex: -1,
            type: 'line', x: barArea.x, y: barArea.y, width: 0, height: barArea.h,
            stroke: pal.connector, strokeWidth: 2
        });
        // X axis
        objects.push({
            _saId: this._id(), _saRole: 'axis-x', _saIndex: -1,
            type: 'line', x: barArea.x, y: barArea.y + barArea.h, width: barArea.w, height: 0,
            stroke: pal.connector, strokeWidth: 2
        });
        objects.push(...this._renderChartFurniture({
            plotArea: barArea, valueMin: 0, valueMax: max,
            pal, textColor, valueAxis: 'y',
            suffix: titles.suffix, valueTitle: titles.valueTitle,
            categoryTitle: titles.categoryTitle
        }));
        const groupW = (barArea.w - 12 * (items.length - 1)) / items.length;
        const innerGap = 2;
        const subBarW = (groupW - innerGap * (seriesN - 1)) / seriesN;
        items.forEach((item, i) => {
            const values = this._getItemSeriesValues(item);
            const groupX = barArea.x + 6 + i * (groupW + 12);
            for (let s = 0; s < seriesN; s++) {
                const v = values[s] != null ? values[s] : 0;
                const h = barArea.h * Math.max(0, v / max);
                const bx = groupX + s * (subBarW + innerGap);
                const by = barArea.y + barArea.h - h;
                objects.push({
                    _saId: this._id(), _saRole: 'bar', _saIndex: i,
                    type: 'rectangle', x: bx, y: by, width: Math.max(2, subBarW), height: h,
                    fill: pal.colors[s % pal.colors.length],
                    borderRadius: 3, strokeWidth: 0
                });
            }
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: groupX, y: barArea.y + barArea.h + 6,
                width: groupW, height: 22,
                text: item.text, textColor,
                fontSize: Math.min(11, groupW * 0.14),
                textAlign: 'center', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    // Stacked bar chart: each item is a category; series values are stacked on top of each other.
    // Honours `this._barOrientation` ('vertical' default | 'horizontal') set by the manager.
    _genStackedBarChart(items, pal, sw, sh) {
        if (this._barOrientation === 'horizontal') {
            return this._genStackedBarChartHorizontal(items, pal, sw, sh);
        }
        const r = this._region(sw, sh);
        const objects = [];
        const textColor = pal.text === '#ffffff' ? '#cccccc' : '#333333';
        const titles = this._chartAxisTitles();
        const seriesN = this._seriesCount(items);
        const labels = this._resolveSeriesLabels(seriesN);
        const legend = this._renderSeriesLegend(labels, pal, r.x + 50, r.y + 4, r.w - 60, textColor);
        objects.push(...legend.objects);
        const top = r.y + legend.height + 12;
        const bottomPad = titles.categoryTitle ? 80 : 50;
        const barArea = { x: r.x + 50, y: top, w: r.w - 60, h: r.h - (top - r.y) - bottomPad };
        // Find max stack total for scaling
        let max = 0;
        items.forEach(it => {
            const sum = this._getItemSeriesValues(it).reduce((a, b) => a + Math.max(0, b), 0);
            if (sum > max) max = sum;
        });
        if (max <= 0) max = 1;
        objects.push({
            _saId: this._id(), _saRole: 'axis-y', _saIndex: -1,
            type: 'line', x: barArea.x, y: barArea.y, width: 0, height: barArea.h,
            stroke: pal.connector, strokeWidth: 2
        });
        objects.push({
            _saId: this._id(), _saRole: 'axis-x', _saIndex: -1,
            type: 'line', x: barArea.x, y: barArea.y + barArea.h, width: barArea.w, height: 0,
            stroke: pal.connector, strokeWidth: 2
        });
        objects.push(...this._renderChartFurniture({
            plotArea: barArea, valueMin: 0, valueMax: max,
            pal, textColor, valueAxis: 'y',
            suffix: titles.suffix, valueTitle: titles.valueTitle,
            categoryTitle: titles.categoryTitle
        }));
        const barW = (barArea.w - 12 * (items.length - 1)) / items.length;
        items.forEach((item, i) => {
            const values = this._getItemSeriesValues(item);
            const bx = barArea.x + 6 + i * (barW + 12);
            let cursorY = barArea.y + barArea.h;
            for (let s = 0; s < seriesN; s++) {
                const v = Math.max(0, values[s] != null ? values[s] : 0);
                const h = barArea.h * (v / max);
                cursorY -= h;
                if (h <= 0) continue;
                objects.push({
                    _saId: this._id(), _saRole: 'bar', _saIndex: i,
                    type: 'rectangle', x: bx, y: cursorY, width: Math.max(2, barW), height: h,
                    fill: pal.colors[s % pal.colors.length],
                    borderRadius: 0, strokeWidth: 0
                });
            }
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: bx, y: barArea.y + barArea.h + 6,
                width: barW, height: 22,
                text: item.text, textColor,
                fontSize: Math.min(11, barW * 0.14),
                textAlign: 'center', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    // Horizontal clustered bars: categories on Y axis, value bars extend right.
    _genClusteredBarChartHorizontal(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const textColor = pal.text === '#ffffff' ? '#cccccc' : '#333333';
        const titles = this._chartAxisTitles();
        const seriesN = this._seriesCount(items);
        const labels = this._resolveSeriesLabels(seriesN);
        const labelGutter = Math.min(140, Math.max(70, r.w * 0.18));
        const legend = this._renderSeriesLegend(labels, pal, r.x + labelGutter, r.y + 4, r.w - labelGutter - 10, textColor);
        objects.push(...legend.objects);
        const top = r.y + legend.height + 12;
        const bottomPad = titles.valueTitle ? 56 : 30;
        const plot = { x: r.x + labelGutter, y: top, w: r.w - labelGutter - 20, h: r.h - (top - r.y) - bottomPad };
        let max = 0;
        items.forEach(it => this._getItemSeriesValues(it).forEach(v => { if (v > max) max = v; }));
        if (max <= 0) max = 1;
        objects.push({
            _saId: this._id(), _saRole: 'axis-y', _saIndex: -1,
            type: 'line', x: plot.x, y: plot.y, width: 0, height: plot.h,
            stroke: pal.connector, strokeWidth: 2
        });
        objects.push({
            _saId: this._id(), _saRole: 'axis-x', _saIndex: -1,
            type: 'line', x: plot.x, y: plot.y + plot.h, width: plot.w, height: 0,
            stroke: pal.connector, strokeWidth: 2
        });
        objects.push(...this._renderChartFurniture({
            plotArea: plot, valueMin: 0, valueMax: max,
            pal, textColor, valueAxis: 'x',
            suffix: titles.suffix, valueTitle: titles.valueTitle,
            categoryTitle: titles.categoryTitle
        }));
        const groupGap = 12;
        const groupH = (plot.h - groupGap * (items.length - 1)) / items.length;
        const innerGap = 2;
        const subBarH = (groupH - innerGap * (seriesN - 1)) / seriesN;
        items.forEach((item, i) => {
            const values = this._getItemSeriesValues(item);
            const groupY = plot.y + i * (groupH + groupGap);
            for (let s = 0; s < seriesN; s++) {
                const v = values[s] != null ? values[s] : 0;
                const w = plot.w * Math.max(0, v / max);
                const by = groupY + s * (subBarH + innerGap);
                objects.push({
                    _saId: this._id(), _saRole: 'bar', _saIndex: i,
                    type: 'rectangle', x: plot.x, y: by, width: w, height: Math.max(2, subBarH),
                    fill: pal.colors[s % pal.colors.length],
                    borderRadius: 3, strokeWidth: 0
                });
            }
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: r.x, y: groupY,
                width: labelGutter - 8, height: groupH,
                text: item.text, textColor,
                fontSize: Math.min(12, groupH * 0.4),
                textAlign: 'right', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    // Horizontal stacked bars: categories on Y axis, segments stack rightward.
    _genStackedBarChartHorizontal(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const textColor = pal.text === '#ffffff' ? '#cccccc' : '#333333';
        const titles = this._chartAxisTitles();
        const seriesN = this._seriesCount(items);
        const labels = this._resolveSeriesLabels(seriesN);
        const labelGutter = Math.min(140, Math.max(70, r.w * 0.18));
        const legend = this._renderSeriesLegend(labels, pal, r.x + labelGutter, r.y + 4, r.w - labelGutter - 10, textColor);
        objects.push(...legend.objects);
        const top = r.y + legend.height + 12;
        const bottomPad = titles.valueTitle ? 56 : 30;
        const plot = { x: r.x + labelGutter, y: top, w: r.w - labelGutter - 20, h: r.h - (top - r.y) - bottomPad };
        let max = 0;
        items.forEach(it => {
            const sum = this._getItemSeriesValues(it).reduce((a, b) => a + Math.max(0, b), 0);
            if (sum > max) max = sum;
        });
        if (max <= 0) max = 1;
        objects.push({
            _saId: this._id(), _saRole: 'axis-y', _saIndex: -1,
            type: 'line', x: plot.x, y: plot.y, width: 0, height: plot.h,
            stroke: pal.connector, strokeWidth: 2
        });
        objects.push({
            _saId: this._id(), _saRole: 'axis-x', _saIndex: -1,
            type: 'line', x: plot.x, y: plot.y + plot.h, width: plot.w, height: 0,
            stroke: pal.connector, strokeWidth: 2
        });
        objects.push(...this._renderChartFurniture({
            plotArea: plot, valueMin: 0, valueMax: max,
            pal, textColor, valueAxis: 'x',
            suffix: titles.suffix, valueTitle: titles.valueTitle,
            categoryTitle: titles.categoryTitle
        }));
        const rowGap = 12;
        const rowH = (plot.h - rowGap * (items.length - 1)) / items.length;
        items.forEach((item, i) => {
            const values = this._getItemSeriesValues(item);
            const ry = plot.y + i * (rowH + rowGap);
            let cursorX = plot.x;
            for (let s = 0; s < seriesN; s++) {
                const v = Math.max(0, values[s] != null ? values[s] : 0);
                const w = plot.w * (v / max);
                if (w <= 0) continue;
                objects.push({
                    _saId: this._id(), _saRole: 'bar', _saIndex: i,
                    type: 'rectangle', x: cursorX, y: ry, width: w, height: Math.max(2, rowH),
                    fill: pal.colors[s % pal.colors.length],
                    borderRadius: 0, strokeWidth: 0
                });
                cursorX += w;
            }
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: r.x, y: ry,
                width: labelGutter - 8, height: rowH,
                text: item.text, textColor,
                fontSize: Math.min(12, rowH * 0.4),
                textAlign: 'right', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    // Line chart: one polyline + markers, x-axis labels per item.
    _genLineChart(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const textColor = pal.text === '#ffffff' ? '#cccccc' : '#333333';
        const titles = this._chartAxisTitles();
        const top = r.y + (titles.valueTitle ? 24 : 8);
        const bottomPad = titles.categoryTitle ? 80 : 60;
        const plotArea = { x: r.x + 50, y: top, w: r.w - 60, h: r.h - (top - r.y) - bottomPad };
        // Single-series line: use first numeric value or _getItemRatio fallback
        const values = items.map((it, i) => {
            const v = this._getItemNumericValue(it, null);
            return v != null ? v : (0.3 + (i * 0.13)) * 100;
        });
        const max = Math.max(1, ...values);
        const min = Math.min(0, ...values);
        const range = (max - min) || 1;
        const stepX = items.length > 1 ? plotArea.w / (items.length - 1) : 0;
        // Axes
        objects.push({
            _saId: this._id(), _saRole: 'axis-y', _saIndex: -1,
            type: 'line', x: plotArea.x, y: plotArea.y, width: 0, height: plotArea.h,
            stroke: pal.connector, strokeWidth: 2
        });
        objects.push({
            _saId: this._id(), _saRole: 'axis-x', _saIndex: -1,
            type: 'line', x: plotArea.x, y: plotArea.y + plotArea.h, width: plotArea.w, height: 0,
            stroke: pal.connector, strokeWidth: 2
        });
        objects.push(...this._renderChartFurniture({
            plotArea, valueMin: min, valueMax: max,
            pal, textColor, valueAxis: 'y',
            suffix: titles.suffix, valueTitle: titles.valueTitle,
            categoryTitle: titles.categoryTitle
        }));
        // Polyline as connected segments
        const points = values.map((v, i) => ({
            x: plotArea.x + (items.length === 1 ? plotArea.w / 2 : i * stepX),
            y: plotArea.y + plotArea.h - ((v - min) / range) * plotArea.h
        }));
        for (let i = 0; i < points.length - 1; i++) {
            const a = points[i], b = points[i + 1];
            objects.push({
                _saId: this._id(), _saRole: 'line-seg', _saIndex: i,
                type: 'line', x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y,
                stroke: pal.colors[0], strokeWidth: 3
            });
        }
        // Markers + labels
        items.forEach((item, i) => {
            const p = points[i];
            const mr = 5;
            objects.push({
                _saId: this._id(), _saRole: 'marker', _saIndex: i,
                type: 'circle', x: p.x - mr, y: p.y - mr, width: mr * 2, height: mr * 2,
                fill: pal.colors[0], strokeWidth: 2, stroke: pal.bg || '#ffffff'
            });
            objects.push({
                _saId: this._id(), _saRole: 'value', _saIndex: i,
                type: 'text', x: p.x - 30, y: p.y - 22, width: 60, height: 14,
                text: this._getItemSecondaryValue(item, String(Math.round(values[i]))),
                textColor, fontSize: 10, textAlign: 'center', fontWeight: '600',
                fill: 'transparent', strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: p.x - stepX / 2, y: plotArea.y + plotArea.h + 6,
                width: Math.max(40, stepX), height: 22,
                text: item.text, textColor,
                fontSize: 11, textAlign: 'center', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    // Multi-line chart: each comma-separated value is a separate line.
    _genMultiLineChart(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const textColor = pal.text === '#ffffff' ? '#cccccc' : '#333333';
        const titles = this._chartAxisTitles();
        const seriesN = this._seriesCount(items);
        const labels = this._resolveSeriesLabels(seriesN);
        const legend = this._renderSeriesLegend(labels, pal, r.x + 50, r.y + 4, r.w - 60, textColor);
        objects.push(...legend.objects);
        const top = r.y + legend.height + 12;
        const bottomPad = titles.categoryTitle ? 80 : 50;
        const plotArea = { x: r.x + 50, y: top, w: r.w - 60, h: r.h - (top - r.y) - bottomPad };
        // Build matrix [series][item]
        const matrix = Array.from({ length: seriesN }, () => []);
        let max = 0;
        items.forEach(it => {
            const vals = this._getItemSeriesValues(it);
            for (let s = 0; s < seriesN; s++) {
                const v = vals[s] != null ? vals[s] : 0;
                matrix[s].push(v);
                if (v > max) max = v;
            }
        });
        if (max <= 0) max = 1;
        const stepX = items.length > 1 ? plotArea.w / (items.length - 1) : 0;
        objects.push({
            _saId: this._id(), _saRole: 'axis-y', _saIndex: -1,
            type: 'line', x: plotArea.x, y: plotArea.y, width: 0, height: plotArea.h,
            stroke: pal.connector, strokeWidth: 2
        });
        objects.push({
            _saId: this._id(), _saRole: 'axis-x', _saIndex: -1,
            type: 'line', x: plotArea.x, y: plotArea.y + plotArea.h, width: plotArea.w, height: 0,
            stroke: pal.connector, strokeWidth: 2
        });
        objects.push(...this._renderChartFurniture({
            plotArea, valueMin: 0, valueMax: max,
            pal, textColor, valueAxis: 'y',
            suffix: titles.suffix, valueTitle: titles.valueTitle,
            categoryTitle: titles.categoryTitle
        }));
        for (let s = 0; s < seriesN; s++) {
            const color = pal.colors[s % pal.colors.length];
            const points = matrix[s].map((v, i) => ({
                x: plotArea.x + (items.length === 1 ? plotArea.w / 2 : i * stepX),
                y: plotArea.y + plotArea.h - (v / max) * plotArea.h
            }));
            for (let i = 0; i < points.length - 1; i++) {
                const a = points[i], b = points[i + 1];
                objects.push({
                    _saId: this._id(), _saRole: 'line-seg', _saIndex: s,
                    type: 'line', x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y,
                    stroke: color, strokeWidth: 2.5
                });
            }
            points.forEach((p, i) => {
                const mr = 4;
                objects.push({
                    _saId: this._id(), _saRole: 'marker', _saIndex: s,
                    type: 'circle', x: p.x - mr, y: p.y - mr, width: mr * 2, height: mr * 2,
                    fill: color, strokeWidth: 1.5, stroke: pal.bg || '#ffffff'
                });
            });
        }
        // X-axis category labels
        items.forEach((item, i) => {
            const x = plotArea.x + (items.length === 1 ? plotArea.w / 2 : i * stepX);
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: x - stepX / 2, y: plotArea.y + plotArea.h + 6,
                width: Math.max(40, stepX), height: 22,
                text: item.text, textColor,
                fontSize: 11, textAlign: 'center', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    // Combo chart: bars (series 0) + line (series 1) on a dual axis.
    _genComboChart(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const textColor = pal.text === '#ffffff' ? '#cccccc' : '#333333';
        const titles = this._chartAxisTitles();
        const labels = this._resolveSeriesLabels(2);
        const legend = this._renderSeriesLegend(labels, pal, r.x + 60, r.y + 4, r.w - 120, textColor);
        objects.push(...legend.objects);
        const top = r.y + legend.height + 12;
        const bottomPad = titles.categoryTitle ? 80 : 50;
        const plotArea = { x: r.x + 50, y: top, w: r.w - 100, h: r.h - (top - r.y) - bottomPad };
        const barValues = items.map(it => {
            const v = this._getItemSeriesValues(it);
            return v[0] != null ? v[0] : (this._getItemNumericValue(it, 0) || 0);
        });
        const lineValues = items.map(it => {
            const v = this._getItemSeriesValues(it);
            return v[1] != null ? v[1] : 0;
        });
        const barMax = Math.max(1, ...barValues);
        const lineMax = Math.max(1, ...lineValues);
        // Left axis (bars)
        objects.push({
            _saId: this._id(), _saRole: 'axis-y', _saIndex: -1,
            type: 'line', x: plotArea.x, y: plotArea.y, width: 0, height: plotArea.h,
            stroke: pal.colors[0], strokeWidth: 2
        });
        // Right axis (line)
        objects.push({
            _saId: this._id(), _saRole: 'axis-y2', _saIndex: -1,
            type: 'line', x: plotArea.x + plotArea.w, y: plotArea.y, width: 0, height: plotArea.h,
            stroke: pal.colors[1 % pal.colors.length], strokeWidth: 2
        });
        // X axis
        objects.push({
            _saId: this._id(), _saRole: 'axis-x', _saIndex: -1,
            type: 'line', x: plotArea.x, y: plotArea.y + plotArea.h, width: plotArea.w, height: 0,
            stroke: pal.connector, strokeWidth: 2
        });
        // Left (bar) tick labels + titles
        objects.push(...this._renderChartFurniture({
            plotArea, valueMin: 0, valueMax: barMax,
            pal, textColor, valueAxis: 'y',
            suffix: titles.suffix,
            valueTitle: labels[0],
            categoryTitle: titles.categoryTitle
        }));
        // Right (line) tick labels — render manually so they sit on the right side.
        const ticks = 5;
        for (let i = 0; i <= ticks; i++) {
            const t = i / ticks;
            const v = lineMax * t;
            const yy = plotArea.y + plotArea.h - t * plotArea.h;
            objects.push({
                _saId: this._id(), _saRole: 'axis-tick', _saIndex: i,
                type: 'line', x: plotArea.x + plotArea.w, y: yy, width: 4, height: 0,
                stroke: pal.colors[1 % pal.colors.length], strokeWidth: 1
            });
            objects.push({
                _saId: this._id(), _saRole: 'axis-tick-label', _saIndex: i,
                type: 'text', x: plotArea.x + plotArea.w + 6, y: yy - 7, width: 40, height: 14,
                text: this._formatChartTick(v),
                textColor: pal.colors[1 % pal.colors.length],
                fontSize: 9, textAlign: 'left', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
        }
        objects.push({
            _saId: this._id(), _saRole: 'axis-title-y2', _saIndex: -1,
            type: 'text',
            x: plotArea.x + plotArea.w + 6, y: plotArea.y - 16,
            width: 80, height: 14,
            text: labels[1],
            textColor: pal.colors[1 % pal.colors.length],
            fontSize: 10, textAlign: 'left', fontWeight: '700',
            fill: 'transparent', strokeWidth: 0
        });
        const slotW = plotArea.w / items.length;
        const barW = slotW * 0.55;
        // Bars
        items.forEach((item, i) => {
            const v = barValues[i];
            const h = plotArea.h * Math.max(0, v / barMax);
            const cx = plotArea.x + i * slotW + slotW / 2;
            const bx = cx - barW / 2;
            const by = plotArea.y + plotArea.h - h;
            objects.push({
                _saId: this._id(), _saRole: 'bar', _saIndex: i,
                type: 'rectangle', x: bx, y: by, width: barW, height: h,
                fill: pal.colors[0], borderRadius: 3, strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: cx - slotW / 2, y: plotArea.y + plotArea.h + 6,
                width: slotW, height: 22,
                text: item.text, textColor,
                fontSize: Math.min(11, slotW * 0.14),
                textAlign: 'center', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
        });
        // Line points
        const lineColor = pal.colors[1 % pal.colors.length];
        const points = lineValues.map((v, i) => ({
            x: plotArea.x + i * slotW + slotW / 2,
            y: plotArea.y + plotArea.h - (v / lineMax) * plotArea.h
        }));
        for (let i = 0; i < points.length - 1; i++) {
            const a = points[i], b = points[i + 1];
            objects.push({
                _saId: this._id(), _saRole: 'line-seg', _saIndex: i,
                type: 'line', x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y,
                stroke: lineColor, strokeWidth: 3
            });
        }
        points.forEach((p, i) => {
            const mr = 5;
            objects.push({
                _saId: this._id(), _saRole: 'marker', _saIndex: i,
                type: 'circle', x: p.x - mr, y: p.y - mr, width: mr * 2, height: mr * 2,
                fill: lineColor, strokeWidth: 2, stroke: pal.bg || '#ffffff'
            });
        });
        return { objects, connections: [] };
    }

    // ======= BUSINESS STRATEGY generators =======

    _genBusinessModelCanvas(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const sections = ['Key Partners','Key Activities','Value Props','Customer Rel','Channels','Key Resources','Customer Seg','Cost Structure','Revenue'];
        // Top row: 5 cells (2 rows tall for middle one)
        const topH = r.h * 0.65;
        const botH = r.h * 0.35 - 4;
        const col5W = r.w / 5;
        // Top row layout: KP | KA/KR | VP | CR/CH | CS
        const topCols = [
            { sec: 0, x: 0, w: 1 },
            { sec: 1, x: 1, w: 1, h: 0.5 },
            { sec: 2, x: 2, w: 1 },
            { sec: 3, x: 3, w: 1, h: 0.5 },
            { sec: 4, x: 4, w: 1 },
            { sec: 5, x: 1, w: 1, h: 0.5, row: 1 },
            { sec: 6, x: 3, w: 1, h: 0.5, row: 1 }
        ];
        topCols.forEach(c => {
            const idx = c.sec;
            const cellH = c.h ? topH * c.h - 2 : topH;
            const cellY = c.row ? r.y + topH * 0.5 + 2 : r.y;
            objects.push({
                _saId: this._id(), _saRole: 'bmc-cell', _saIndex: idx,
                type: 'rectangle',
                x: r.x + c.x * col5W + 2, y: cellY,
                width: col5W * c.w - 4, height: cellH,
                fill: pal.colors[idx % pal.colors.length] + '15',
                borderRadius: 6, strokeWidth: 1,
                stroke: pal.colors[idx % pal.colors.length] + '60'
            });
            objects.push({
                _saId: this._id(), _saRole: 'bmc-title', _saIndex: idx,
                type: 'text',
                x: r.x + c.x * col5W + 8, y: cellY + 4,
                width: col5W * c.w - 16, height: 20,
                text: sections[idx], textColor: pal.colors[idx % pal.colors.length],
                fontSize: 9, textAlign: 'left', fontWeight: '700',
                fill: 'transparent', strokeWidth: 0
            });
            if (items[idx] && items[idx].text !== sections[idx]) {
                objects.push({
                    _saId: this._id(), _saRole: 'bmc-content', _saIndex: idx,
                    type: 'text',
                    x: r.x + c.x * col5W + 8, y: cellY + 22,
                    width: col5W * c.w - 16, height: cellH - 28,
                    text: items[idx].text, textColor: pal.text === '#ffffff' ? '#bbbbbb' : '#555555',
                    fontSize: 9, textAlign: 'left', fontWeight: '400',
                    fill: 'transparent', strokeWidth: 0
                });
            }
        });
        // Bottom row: Cost Structure | Revenue
        [7, 8].forEach((idx, i) => {
            const bx = r.x + i * (r.w / 2) + 2;
            objects.push({
                _saId: this._id(), _saRole: 'bmc-cell', _saIndex: idx,
                type: 'rectangle', x: bx, y: r.y + topH + 4,
                width: r.w / 2 - 4, height: botH,
                fill: pal.colors[idx % pal.colors.length] + '15',
                borderRadius: 6, strokeWidth: 1,
                stroke: pal.colors[idx % pal.colors.length] + '60'
            });
            objects.push({
                _saId: this._id(), _saRole: 'bmc-title', _saIndex: idx,
                type: 'text', x: bx + 8, y: r.y + topH + 8,
                width: r.w / 2 - 20, height: 20,
                text: sections[idx], textColor: pal.colors[idx % pal.colors.length],
                fontSize: 10, textAlign: 'left', fontWeight: '700',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genPestleAnalysis(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const labels = ['Political','Economic','Social','Technological','Legal','Environmental'];
        const cols = 3, rows = 2;
        const gap = 10;
        const cw = (r.w - gap * (cols - 1)) / cols;
        const ch = (r.h - gap * (rows - 1)) / rows;
        items.forEach((item, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const bx = r.x + col * (cw + gap);
            const by = r.y + row * (ch + gap);
            objects.push({
                _saId: this._id(), _saRole: 'card', _saIndex: i,
                type: 'rectangle', x: bx, y: by, width: cw, height: ch,
                fill: pal.colors[i % pal.colors.length] + '18',
                borderRadius: 10, strokeWidth: 2,
                stroke: pal.colors[i % pal.colors.length]
            });
            objects.push({
                _saId: this._id(), _saRole: 'initial', _saIndex: i,
                type: 'circle', x: bx + 10, y: by + 10,
                width: 28, height: 28,
                fill: pal.colors[i % pal.colors.length], strokeWidth: 0,
                text: labels[i]?.[0] || '', textColor: '#ffffff',
                fontSize: 14, textAlign: 'center', fontWeight: '700'
            });
            objects.push({
                _saId: this._id(), _saRole: 'title', _saIndex: i,
                type: 'text', x: bx + 44, y: by + 10,
                width: cw - 54, height: 28,
                text: labels[i] || item.text, textColor: pal.colors[i % pal.colors.length],
                fontSize: 12, textAlign: 'left', fontWeight: '700',
                fill: 'transparent', strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'content', _saIndex: i,
                type: 'text', x: bx + 10, y: by + 46,
                width: cw - 20, height: ch - 56,
                text: item.text, textColor: pal.text === '#ffffff' ? '#bbbbbb' : '#555555',
                fontSize: 10, textAlign: 'left', fontWeight: '400',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genPortersFive(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const boxW = r.w * 0.28;
        const boxH = r.h * 0.22;
        // Center: Rivalry
        objects.push({
            _saId: this._id(), _saRole: 'center', _saIndex: 0,
            type: 'rectangle', x: cx - boxW / 2, y: cy - boxH / 2,
            width: boxW, height: boxH,
            fill: pal.colors[0], borderRadius: 10, strokeWidth: 0,
            text: items[0]?.text || 'Rivalry', textColor: pal.text,
            fontSize: 12, textAlign: 'center', fontWeight: '700'
        });
        // Top: New Entrants
        objects.push({
            _saId: this._id(), _saRole: 'force', _saIndex: 1,
            type: 'rectangle', x: cx - boxW / 2, y: r.y,
            width: boxW, height: boxH,
            fill: pal.colors[1], borderRadius: 10, strokeWidth: 0,
            text: items[1]?.text || 'New Entrants', textColor: pal.text,
            fontSize: 11, textAlign: 'center', fontWeight: '600'
        });
        // Bottom: Substitutes
        objects.push({
            _saId: this._id(), _saRole: 'force', _saIndex: 2,
            type: 'rectangle', x: cx - boxW / 2, y: r.y + r.h - boxH,
            width: boxW, height: boxH,
            fill: pal.colors[2], borderRadius: 10, strokeWidth: 0,
            text: items[2]?.text || 'Substitutes', textColor: pal.text,
            fontSize: 11, textAlign: 'center', fontWeight: '600'
        });
        // Left: Suppliers
        objects.push({
            _saId: this._id(), _saRole: 'force', _saIndex: 3,
            type: 'rectangle', x: r.x, y: cy - boxH / 2,
            width: boxW, height: boxH,
            fill: pal.colors[3], borderRadius: 10, strokeWidth: 0,
            text: items[3]?.text || 'Suppliers', textColor: pal.text,
            fontSize: 11, textAlign: 'center', fontWeight: '600'
        });
        // Right: Buyers
        objects.push({
            _saId: this._id(), _saRole: 'force', _saIndex: 4,
            type: 'rectangle', x: r.x + r.w - boxW, y: cy - boxH / 2,
            width: boxW, height: boxH,
            fill: pal.colors[4], borderRadius: 10, strokeWidth: 0,
            text: items[4]?.text || 'Buyers', textColor: pal.text,
            fontSize: 11, textAlign: 'center', fontWeight: '600'
        });
        // Arrows connecting to center
        [[cx, r.y + boxH, cx, cy - boxH/2], [cx, r.y + r.h - boxH, cx, cy + boxH/2],
         [r.x + boxW, cy, cx - boxW/2, cy], [r.x + r.w - boxW, cy, cx + boxW/2, cy]].forEach((coords, i) => {
            objects.push({
                _saId: this._id(), _saRole: 'arrow', _saIndex: i,
                type: 'line', x: coords[0], y: coords[1],
                width: coords[2] - coords[0], height: coords[3] - coords[1],
                stroke: pal.connector, strokeWidth: 2
            });
        });
        return { objects, connections: [] };
    }

    _genOKRFramework(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const headerH = r.h * 0.18;
        // Objective header
        objects.push({
            _saId: this._id(), _saRole: 'objective', _saIndex: 0,
            type: 'rectangle', x: r.x, y: r.y, width: r.w, height: headerH,
            fill: pal.colors[0], borderRadius: 10, strokeWidth: 0,
            text: items[0]?.text || 'Objective', textColor: pal.text,
            fontSize: 16, textAlign: 'center', fontWeight: '700'
        });
        // Key Results below
        const krItems = items.slice(1);
        const gap = 10;
        const krH = (r.h - headerH - gap * (krItems.length)) / krItems.length;
        krItems.forEach((item, i) => {
            const yy = r.y + headerH + gap + i * (krH + gap);
            objects.push({
                _saId: this._id(), _saRole: 'kr', _saIndex: i + 1,
                type: 'rectangle', x: r.x + 30, y: yy,
                width: r.w - 30, height: krH,
                fill: pal.colors[(i + 1) % pal.colors.length] + '20',
                borderRadius: 8, strokeWidth: 2,
                stroke: pal.colors[(i + 1) % pal.colors.length],
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: Math.min(13, krH * 0.35), textAlign: 'left', fontWeight: '500'
            });
            objects.push({
                _saId: this._id(), _saRole: 'kr-num', _saIndex: i + 1,
                type: 'circle', x: r.x, y: yy + (krH - 24) / 2,
                width: 24, height: 24,
                fill: pal.colors[(i + 1) % pal.colors.length], strokeWidth: 0,
                text: `KR${i + 1}`, textColor: '#ffffff',
                fontSize: 8, textAlign: 'center', fontWeight: '700'
            });
        });
        return { objects, connections: [] };
    }

    _genPDCACycle(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const gap = 6;
        const halfW = (r.w - gap) / 2;
        const halfH = (r.h - gap) / 2;
        const pos = [[0,0],[1,0],[0,1],[1,1]];
        items.forEach((item, i) => {
            const [c, rw] = pos[i] || [0,0];
            objects.push({
                _saId: this._id(), _saRole: 'quad', _saIndex: i,
                type: 'rectangle',
                x: r.x + c * (halfW + gap), y: r.y + rw * (halfH + gap),
                width: halfW, height: halfH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 12, strokeWidth: 0,
                text: item.text, textColor: pal.text,
                fontSize: Math.min(18, halfW * 0.1), textAlign: 'center', fontWeight: '700'
            });
        });
        // Center circle
        const cr = Math.min(halfW, halfH) * 0.2;
        objects.push({
            _saId: this._id(), _saRole: 'center', _saIndex: -1,
            type: 'circle',
            x: r.x + r.w / 2 - cr, y: r.y + r.h / 2 - cr,
            width: cr * 2, height: cr * 2,
            fill: pal.bg || '#ffffff', strokeWidth: 3,
            stroke: pal.connector,
            text: '↻', textColor: pal.connector,
            fontSize: cr, textAlign: 'center', fontWeight: '400'
        });
        return { objects, connections: [] };
    }

    _genServiceBlueprint(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const labelW = Math.min(120, r.w * 0.18);
        const gap = 10;
        const laneGap = 8;
        const laneH = (r.h - laneGap * 2) / 3;
        const colW = (r.w - labelW - gap * (items.length - 1)) / items.length;
        const laneTitles = ['Customer Actions', 'Touchpoints', 'Backstage'];
        const laneFills = ['16', '10', '12'];
        const laneText = ['What the customer sees', 'What delivers the experience', 'What supports the service'];

        laneTitles.forEach((title, laneIndex) => {
            const laneY = r.y + laneIndex * (laneH + laneGap);
            objects.push({
                _saId: this._id(), _saRole: 'lane-label', _saIndex: laneIndex,
                type: 'rectangle', x: r.x, y: laneY,
                width: labelW - 12, height: laneH,
                fill: pal.colors[laneIndex % pal.colors.length] + '22',
                borderRadius: 10, strokeWidth: 1,
                stroke: pal.colors[laneIndex % pal.colors.length] + '66'
            });
            objects.push({
                _saId: this._id(), _saRole: 'lane-title', _saIndex: laneIndex,
                type: 'text', x: r.x + 10, y: laneY + 10,
                width: labelW - 32, height: 26,
                text: title, textColor: pal.colors[laneIndex % pal.colors.length],
                fontSize: 11, textAlign: 'left', fontWeight: '700',
                fill: 'transparent', strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'lane-copy', _saIndex: laneIndex,
                type: 'text', x: r.x + 10, y: laneY + 38,
                width: labelW - 28, height: laneH - 48,
                text: laneText[laneIndex], textColor: pal.text === '#ffffff' ? '#bbbbbb' : '#555555',
                fontSize: 9, textAlign: 'left', fontWeight: '400',
                fill: 'transparent', strokeWidth: 0
            });
        });

        items.forEach((item, index) => {
            const colX = r.x + labelW + index * (colW + gap);
            const accent = pal.colors[index % pal.colors.length];
            const touchpointText = item.subtext || 'Frontstage evidence';
            const backstageText = item.detail || `Ops support for ${item.text}`;

            objects.push({
                _saId: this._id(), _saRole: 'phase-header', _saIndex: index,
                type: 'text', x: colX, y: r.y - 4,
                width: colW, height: 18,
                text: `Phase ${index + 1}`, textColor: accent,
                fontSize: 10, textAlign: 'center', fontWeight: '700',
                fill: 'transparent', strokeWidth: 0
            });

            laneTitles.forEach((_, laneIndex) => {
                const laneY = r.y + laneIndex * (laneH + laneGap);
                const contentY = laneY + 16;
                const contentH = laneH - 20;
                const text = laneIndex === 0 ? item.text : (laneIndex === 1 ? touchpointText : backstageText);
                objects.push({
                    _saId: this._id(), _saRole: 'blueprint-cell', _saIndex: index * 3 + laneIndex,
                    type: 'rectangle', x: colX, y: contentY,
                    width: colW, height: contentH,
                    fill: accent + laneFills[laneIndex],
                    borderRadius: 10, strokeWidth: laneIndex === 1 ? 2 : 1,
                    stroke: laneIndex === 1 ? accent : accent + '66',
                    text, textColor: pal.text === '#ffffff' ? '#dddddd' : '#333333',
                    fontSize: laneIndex === 0 ? 12 : 10,
                    textAlign: 'center', fontWeight: laneIndex === 0 ? '700' : '500'
                });
            });

            if (index < items.length - 1) {
                const arrowX = colX + colW + 2;
                const arrowY = r.y + laneH / 2 + 10;
                objects.push({
                    _saId: this._id(), _saRole: 'phase-flow', _saIndex: index,
                    type: 'line', x: arrowX, y: arrowY,
                    width: gap - 4, height: 0,
                    stroke: pal.connector, strokeWidth: 2
                });
            }
        });

        return { objects, connections: [] };
    }

    _genValueChain(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const gap = 4;
        const arrowW = r.w / items.length;
        const arrowH = r.h * 0.5;
        const yy = r.y + (r.h - arrowH) / 2;
        items.forEach((item, i) => {
            objects.push({
                _saId: this._id(), _saRole: 'arrow', _saIndex: i,
                type: 'arrow', x: r.x + i * arrowW, y: yy,
                width: arrowW - gap, height: arrowH,
                fill: pal.colors[i % pal.colors.length], strokeWidth: 0,
                text: item.text, textColor: pal.text,
                fontSize: Math.min(13, arrowW * 0.1), textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    // ======= MARKETING & SALES generators =======

    _genMarketingFunnel(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 4;
        const segH = (r.h - gap * (items.length - 1)) / items.length;
        const objects = [];
        items.forEach((item, i) => {
            const taper = i / items.length * 0.45;
            const segW = r.w * (1 - taper);
            const xOff = (r.w - segW) / 2;
            objects.push({
                _saId: this._id(), _saRole: 'funnel', _saIndex: i,
                type: 'rectangle',
                x: r.x + xOff, y: r.y + i * (segH + gap),
                width: segW, height: segH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: segH * 0.2, strokeWidth: 0,
                text: item.text, textColor: pal.text,
                fontSize: Math.min(16, segH * 0.35), textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genCustomerJourney(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const stepW = r.w / items.length;
        const pathY = r.y + r.h * 0.5;
        // Path line
        objects.push({
            _saId: this._id(), _saRole: 'path', _saIndex: -1,
            type: 'line', x: r.x, y: pathY, width: r.w, height: 0,
            stroke: pal.connector, strokeWidth: 3
        });
        items.forEach((item, i) => {
            const cx = r.x + stepW * (i + 0.5);
            const iconR = Math.min(22, stepW * 0.15);
            objects.push({
                _saId: this._id(), _saRole: 'node', _saIndex: i,
                type: 'circle', x: cx - iconR, y: pathY - iconR,
                width: iconR * 2, height: iconR * 2,
                fill: pal.colors[i % pal.colors.length],
                strokeWidth: 3, stroke: '#ffffff',
                text: String(i + 1), textColor: '#ffffff',
                fontSize: iconR * 0.8, textAlign: 'center', fontWeight: '700'
            });
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: cx - stepW * 0.4, y: pathY + iconR + 12,
                width: stepW * 0.8, height: 40,
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: Math.min(12, stepW * 0.12), textAlign: 'center', fontWeight: '600',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genPersonaCard(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        // Card background
        objects.push({
            _saId: this._id(), _saRole: 'card-bg', _saIndex: -1,
            type: 'rectangle', x: r.x, y: r.y, width: r.w, height: r.h,
            fill: pal.colors[0] + '10', borderRadius: 16,
            strokeWidth: 2, stroke: pal.colors[0] + '40'
        });
        // Avatar
        const avatarR = Math.min(r.w * 0.12, r.h * 0.15);
        objects.push({
            _saId: this._id(), _saRole: 'avatar', _saIndex: 0,
            type: 'circle', x: r.x + 20, y: r.y + 20,
            width: avatarR * 2, height: avatarR * 2,
            fill: pal.colors[0], strokeWidth: 3, stroke: '#ffffff',
            text: '👤', fontSize: avatarR * 0.8, textAlign: 'center'
        });
        // Name
        objects.push({
            _saId: this._id(), _saRole: 'name', _saIndex: 0,
            type: 'text', x: r.x + 30 + avatarR * 2, y: r.y + 20,
            width: r.w * 0.5, height: avatarR,
            text: items[0]?.text || 'Name', textColor: pal.colors[0],
            fontSize: 18, textAlign: 'left', fontWeight: '700',
            fill: 'transparent', strokeWidth: 0
        });
        // Detail fields
        const fields = items.slice(1);
        const fieldH = (r.h - avatarR * 2 - 50) / fields.length;
        const startY = r.y + 30 + avatarR * 2;
        fields.forEach((item, i) => {
            objects.push({
                _saId: this._id(), _saRole: 'field', _saIndex: i + 1,
                type: 'rectangle', x: r.x + 16, y: startY + i * (fieldH + 6),
                width: r.w - 32, height: fieldH,
                fill: pal.colors[(i + 1) % pal.colors.length] + '12',
                borderRadius: 8, strokeWidth: 0,
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#444444',
                fontSize: Math.min(12, fieldH * 0.4), textAlign: 'left', fontWeight: '500'
            });
        });
        return { objects, connections: [] };
    }

    _genFourPs(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const gap = 10;
        const halfW = (r.w - gap) / 2;
        const halfH = (r.h - gap) / 2;
        const labels = ['Product','Price','Place','Promotion'];
        const pos = [[0,0],[1,0],[0,1],[1,1]];
        items.forEach((item, i) => {
            const [c, rw] = pos[i] || [0,0];
            const bx = r.x + c * (halfW + gap);
            const by = r.y + rw * (halfH + gap);
            objects.push({
                _saId: this._id(), _saRole: 'card', _saIndex: i,
                type: 'rectangle', x: bx, y: by, width: halfW, height: halfH,
                fill: pal.colors[i % pal.colors.length] + '18',
                borderRadius: 12, strokeWidth: 2,
                stroke: pal.colors[i % pal.colors.length]
            });
            objects.push({
                _saId: this._id(), _saRole: 'title', _saIndex: i,
                type: 'text', x: bx + 12, y: by + 10,
                width: halfW - 24, height: 24,
                text: labels[i] || item.text, textColor: pal.colors[i % pal.colors.length],
                fontSize: 14, textAlign: 'left', fontWeight: '700',
                fill: 'transparent', strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'content', _saIndex: i,
                type: 'text', x: bx + 12, y: by + 38,
                width: halfW - 24, height: halfH - 48,
                text: item.text, textColor: pal.text === '#ffffff' ? '#bbbbbb' : '#555555',
                fontSize: 11, textAlign: 'left', fontWeight: '400',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genCompetitorAnalysis(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 10;
        const colW = (r.w - gap * (items.length - 1)) / items.length;
        const headerH = 50;
        const objects = [];
        items.forEach((item, i) => {
            const bx = r.x + i * (colW + gap);
            objects.push({
                _saId: this._id(), _saRole: 'header', _saIndex: i,
                type: 'rectangle', x: bx, y: r.y, width: colW, height: headerH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 8, strokeWidth: 0,
                text: item.text, textColor: pal.text,
                fontSize: Math.min(14, colW * 0.1), textAlign: 'center', fontWeight: '700'
            });
            // Comparison bars
            for (let j = 0; j < 4; j++) {
                const by = r.y + headerH + 12 + j * (r.h - headerH - 12) / 4;
                const barH = (r.h - headerH - 16) / 5;
                const pct = 0.3 + ((i + j * 2) % 7) * 0.1;
                objects.push({
                    _saId: this._id(), _saRole: 'bar', _saIndex: i * 10 + j,
                    type: 'rectangle', x: bx + 8, y: by,
                    width: (colW - 16) * pct, height: barH * 0.6,
                    fill: pal.colors[i % pal.colors.length] + '60',
                    borderRadius: 4, strokeWidth: 0
                });
            }
        });
        return { objects, connections: [] };
    }

    _genSalesPipeline(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 4;
        const stepW = (r.w - gap * (items.length - 1)) / items.length;
        const objects = [];
        items.forEach((item, i) => {
            const shrink = i * 0.06;
            const h = r.h * (1 - shrink);
            const yOff = (r.h - h) / 2;
            objects.push({
                _saId: this._id(), _saRole: 'stage', _saIndex: i,
                type: 'rectangle',
                x: r.x + i * (stepW + gap), y: r.y + yOff,
                width: stepW, height: h,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 8, strokeWidth: 0,
                text: item.text, textColor: pal.text,
                fontSize: Math.min(13, stepW * 0.12), textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    // ======= EDUCATIONAL generators =======

    _genConceptMap(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const hubR = Math.min(r.w, r.h) * 0.14;
        // Center hub
        objects.push({
            _saId: this._id(), _saRole: 'hub', _saIndex: 0,
            type: 'circle', x: cx - hubR, y: cy - hubR,
            width: hubR * 2, height: hubR * 2,
            fill: pal.colors[0], strokeWidth: 0,
            text: items[0]?.text || 'Core', textColor: pal.text,
            fontSize: Math.min(14, hubR * 0.4), textAlign: 'center', fontWeight: '700'
        });
        // Branches
        const branches = items.slice(1);
        const dist = Math.min(r.w, r.h) * 0.35;
        branches.forEach((item, i) => {
            const angle = (Math.PI * 2 * i) / branches.length - Math.PI / 2;
            const nx = cx + Math.cos(angle) * dist;
            const ny = cy + Math.sin(angle) * dist;
            const nodeR = hubR * 0.65;
            // Connector line
            objects.push({
                _saId: this._id(), _saRole: 'link', _saIndex: i + 1,
                type: 'line', x: cx, y: cy,
                width: nx - cx, height: ny - cy,
                stroke: pal.colors[(i + 1) % pal.colors.length] + '60', strokeWidth: 2
            });
            objects.push({
                _saId: this._id(), _saRole: 'node', _saIndex: i + 1,
                type: 'rectangle', x: nx - nodeR, y: ny - nodeR * 0.7,
                width: nodeR * 2, height: nodeR * 1.4,
                fill: pal.colors[(i + 1) % pal.colors.length],
                borderRadius: 8, strokeWidth: 0,
                text: item.text, textColor: pal.text,
                fontSize: Math.min(11, nodeR * 0.3), textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genFlashCards(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const cols = Math.min(items.length, 3);
        const rows = Math.ceil(items.length / cols);
        const gap = 12;
        const cw = (r.w - gap * (cols - 1)) / cols;
        const ch = (r.h - gap * (rows - 1)) / rows;
        const objects = [];
        items.forEach((item, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const bx = r.x + col * (cw + gap);
            const by = r.y + row * (ch + gap);
            objects.push({
                _saId: this._id(), _saRole: 'card', _saIndex: i,
                type: 'rectangle', x: bx, y: by, width: cw, height: ch,
                fill: '#ffffff', borderRadius: 12,
                strokeWidth: 2, stroke: pal.colors[i % pal.colors.length]
            });
            objects.push({
                _saId: this._id(), _saRole: 'accent', _saIndex: i,
                type: 'rectangle', x: bx, y: by, width: cw, height: 6,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 0, strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: bx + 10, y: by + 14,
                width: cw - 20, height: ch - 20,
                text: item.text, textColor: '#333333',
                fontSize: Math.min(14, cw * 0.1), textAlign: 'center', fontWeight: '600',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genLearningPath(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const stepH = r.h / items.length;
        items.forEach((item, i) => {
            const left = i % 2 === 0;
            const markerX = r.x + r.w * 0.5;
            const yy = r.y + i * stepH + stepH / 2;
            if (i < items.length - 1) {
                objects.push({
                    _saId: this._id(), _saRole: 'connector', _saIndex: i,
                    type: 'line', x: markerX, y: yy, width: 0, height: stepH,
                    stroke: pal.connector, strokeWidth: 2
                });
            }
            objects.push({
                _saId: this._id(), _saRole: 'badge', _saIndex: i,
                type: 'circle', x: markerX - 16, y: yy - 16,
                width: 32, height: 32,
                fill: pal.colors[i % pal.colors.length],
                strokeWidth: 3, stroke: '#ffffff',
                text: String(i + 1), textColor: '#ffffff',
                fontSize: 14, textAlign: 'center', fontWeight: '700'
            });
            const cardW = r.w * 0.35;
            const cardX = left ? r.x + 10 : r.x + r.w * 0.55;
            objects.push({
                _saId: this._id(), _saRole: 'card', _saIndex: i,
                type: 'rectangle', x: cardX, y: yy - stepH * 0.3,
                width: cardW, height: stepH * 0.55,
                fill: pal.colors[i % pal.colors.length] + '15',
                borderRadius: 10, strokeWidth: 1,
                stroke: pal.colors[i % pal.colors.length],
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: Math.min(12, cardW * 0.08), textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genGradingRubric(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const headerH = 35;
        const gap = 3;
        const cols = 4; // Criteria levels
        const rowH = (r.h - headerH - gap * items.length) / items.length;
        const criteriaW = r.w * 0.22;
        const levelW = (r.w - criteriaW - gap * cols) / cols;
        const levels = ['Excellent','Good','Needs Work','Poor'];
        // Column headers
        levels.forEach((lev, i) => {
            objects.push({
                _saId: this._id(), _saRole: 'level-header', _saIndex: i,
                type: 'rectangle',
                x: r.x + criteriaW + gap + i * (levelW + gap), y: r.y,
                width: levelW, height: headerH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 4, strokeWidth: 0,
                text: lev, textColor: pal.text,
                fontSize: 10, textAlign: 'center', fontWeight: '600'
            });
        });
        items.forEach((item, i) => {
            const yy = r.y + headerH + gap + i * (rowH + gap);
            objects.push({
                _saId: this._id(), _saRole: 'criteria', _saIndex: i,
                type: 'rectangle', x: r.x, y: yy,
                width: criteriaW, height: rowH,
                fill: pal.colors[i % pal.colors.length] + '25',
                borderRadius: 4, strokeWidth: 0,
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: 10, textAlign: 'center', fontWeight: '600'
            });
            for (let j = 0; j < cols; j++) {
                objects.push({
                    _saId: this._id(), _saRole: 'cell', _saIndex: i * cols + j,
                    type: 'rectangle',
                    x: r.x + criteriaW + gap + j * (levelW + gap), y: yy,
                    width: levelW, height: rowH,
                    fill: pal.colors[j % pal.colors.length] + '08',
                    borderRadius: 3, strokeWidth: 1,
                    stroke: pal.colors[j % pal.colors.length] + '30'
                });
            }
        });
        return { objects, connections: [] };
    }

    _genVocabularyBuilder(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 8;
        const rowH = (r.h - gap * (items.length - 1)) / items.length;
        const objects = [];
        items.forEach((item, i) => {
            const yy = r.y + i * (rowH + gap);
            objects.push({
                _saId: this._id(), _saRole: 'term-bg', _saIndex: i,
                type: 'rectangle', x: r.x, y: yy,
                width: r.w * 0.3, height: rowH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 8, strokeWidth: 0,
                text: item.text, textColor: pal.text,
                fontSize: Math.min(14, rowH * 0.35), textAlign: 'center', fontWeight: '700'
            });
            objects.push({
                _saId: this._id(), _saRole: 'def-bg', _saIndex: i,
                type: 'rectangle', x: r.x + r.w * 0.32, y: yy,
                width: r.w * 0.68, height: rowH,
                fill: pal.colors[i % pal.colors.length] + '12',
                borderRadius: 8, strokeWidth: 1,
                stroke: pal.colors[i % pal.colors.length] + '40',
                text: 'Definition goes here', textColor: pal.text === '#ffffff' ? '#bbbbbb' : '#666666',
                fontSize: Math.min(11, rowH * 0.3), textAlign: 'left', fontWeight: '400'
            });
        });
        return { objects, connections: [] };
    }

    _genFishboneDiagram(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const spineY = r.y + r.h * 0.52;
        const headW = r.w * 0.16;
        const headH = r.h * 0.2;
        const causeCount = items.length;
        const span = r.w - headW - 40;
        const gap = span / Math.max(1, causeCount);

        objects.push({
            _saId: this._id(), _saRole: 'spine', _saIndex: -1,
            type: 'line', x: r.x + 10, y: spineY, width: span, height: 0,
            stroke: pal.connector, strokeWidth: 4
        });
        objects.push({
            _saId: this._id(), _saRole: 'head', _saIndex: -1,
            type: 'diamond', x: r.x + span, y: spineY - headH / 2,
            width: headW, height: headH,
            fill: pal.colors[0], strokeWidth: 0,
            text: 'Effect', textColor: pal.text, fontSize: Math.min(18, headH * 0.28),
            textAlign: 'center', fontWeight: '700'
        });

        items.forEach((item, index) => {
            const anchorX = r.x + 24 + gap * (index + 0.35);
            const isTop = index % 2 === 0;
            const branchHeight = r.h * (isTop ? 0.24 : 0.22);
            const branchEndY = isTop ? spineY - branchHeight : spineY + branchHeight;
            const labelH = 42;
            const labelW = Math.min(150, r.w * 0.2);
            const labelX = isTop ? anchorX - labelW + 8 : anchorX - 8;
            const labelY = isTop ? branchEndY - labelH - 10 : branchEndY + 10;

            objects.push({
                _saId: this._id(), _saRole: 'branch', _saIndex: index,
                type: 'line', x: anchorX, y: spineY,
                width: 0, height: branchEndY - spineY,
                stroke: pal.colors[index % pal.colors.length], strokeWidth: 3
            });
            objects.push({
                _saId: this._id(), _saRole: 'branch-label', _saIndex: index,
                type: 'rectangle', x: labelX, y: labelY,
                width: labelW, height: labelH,
                fill: pal.colors[index % pal.colors.length] + '18',
                borderRadius: 10, strokeWidth: 2,
                stroke: pal.colors[index % pal.colors.length],
                text: item.text, textColor: pal.text === '#ffffff' ? '#dddddd' : '#333333',
                fontSize: 12, textAlign: 'center', fontWeight: '600'
            });
        });

        return { objects, connections: [] };
    }

    // ======= PROJECT MANAGEMENT generators =======

    _genKanbanBoard(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const gap = 10;
        const colW = (r.w - gap * (items.length - 1)) / items.length;
        const headerH = 40;
        const objects = [];
        items.forEach((item, i) => {
            const bx = r.x + i * (colW + gap);
            // Column background
            objects.push({
                _saId: this._id(), _saRole: 'column', _saIndex: i,
                type: 'rectangle', x: bx, y: r.y, width: colW, height: r.h,
                fill: pal.colors[i % pal.colors.length] + '08',
                borderRadius: 12, strokeWidth: 1,
                stroke: pal.colors[i % pal.colors.length] + '30'
            });
            // Header
            objects.push({
                _saId: this._id(), _saRole: 'header', _saIndex: i,
                type: 'rectangle', x: bx + 6, y: r.y + 6,
                width: colW - 12, height: headerH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 8, strokeWidth: 0,
                text: item.text, textColor: pal.text,
                fontSize: Math.min(13, colW * 0.1), textAlign: 'center', fontWeight: '700'
            });
            // Sample cards
            for (let j = 0; j < 3; j++) {
                objects.push({
                    _saId: this._id(), _saRole: 'card', _saIndex: i * 10 + j,
                    type: 'rectangle', x: bx + 8, y: r.y + headerH + 16 + j * 56,
                    width: colW - 16, height: 48,
                    fill: '#ffffff', borderRadius: 8,
                    strokeWidth: 1, stroke: pal.colors[i % pal.colors.length] + '30',
                    text: `Task ${j + 1}`, textColor: '#555555',
                    fontSize: 11, textAlign: 'left', fontWeight: '500'
                });
            }
        });
        return { objects, connections: [] };
    }

    _genGanttChart(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const labelW = r.w * 0.2;
        const chartW = r.w - labelW - 10;

        // --- Try to extract a real (start, end) pair for each item ---
        // Sources, in priority order:
        //   1. Date strings in item.cells (e.g. "2026-01-15", "Jan 15 2026", "15/01/2026")
        //   2. item.values from the table importer (numeric cells after the label)
        //   3. two numbers parsed out of item.subtext (e.g. "0 · 14" or "0-14")
        //   4. item.start / item.end / item.duration explicit fields
        // Dates and numbers live on the same axis (ms vs. unit-less); if any item
        // has dates we treat the whole chart as date-based.
        let isDateAxis = false;
        const parsed = items.map((item, i) => {
            let start = null, end = null, duration = null;

            // 1. Try date parsing on the raw cells first.
            if (Array.isArray(item.cells) && item.cells.length) {
                const dates = [];
                for (const cell of item.cells) {
                    const d = this._parseGanttDate(cell);
                    if (d != null) dates.push(d);
                }
                if (dates.length >= 2) {
                    start = dates[0];
                    end = dates[1];
                    isDateAxis = true;
                } else if (dates.length === 1) {
                    // One date + maybe a numeric duration in days
                    start = dates[0];
                    isDateAxis = true;
                    if (Array.isArray(item.values) && item.values.length) {
                        duration = item.values[0] * 86400000; // days → ms
                    }
                }
            }

            // 2. Numeric values from the importer.
            if (start == null && Array.isArray(item.values) && item.values.length >= 2) {
                start = item.values[0];
                end = item.values[1];
            } else if (start == null && item.subtext) {
                const nums = String(item.subtext).match(/-?\d+(?:\.\d+)?/g);
                if (nums && nums.length >= 2) {
                    start = parseFloat(nums[0]);
                    end = parseFloat(nums[1]);
                }
            }

            // 3. Explicit fields override.
            if (typeof item.start === 'number') start = item.start;
            if (typeof item.end === 'number') end = item.end;
            if (typeof item.duration === 'number') duration = item.duration;

            if (start != null && end != null && end < start) {
                // Treat second number as duration when end < start (numeric only)
                duration = end;
                end = start + duration;
            }
            if (start != null && duration != null && end == null) {
                end = start + duration;
            }
            if (duration == null && start != null && end != null) {
                duration = Math.max(0, end - start);
            }
            return { item, index: i, start, end, duration };
        });

        // A row "has range" if we successfully extracted both start and end.
        // We no longer require ALL rows to have ranges — rows missing data are
        // still rendered (with a synthetic placeholder bar) so the user sees
        // every item and can spot which ones the parser couldn't read.
        const rangedRows = parsed.filter(p => p.start != null && p.end != null && p.end > p.start);
        const hasAnyRange = rangedRows.length > 0;

        const gap = 6;
        const axisH = hasAnyRange ? 26 : 0;
        const usableH = r.h - axisH;
        const barH = (usableH - gap * (items.length - 1)) / items.length;

        if (hasAnyRange) {
            // Detect unit from the table headers (set on the templates instance
            // by the importer). Used for axis title and tick suffixes.
            const unitInfo = this._detectGanttUnit(this._tableHeaders, isDateAxis);

            // Normalize to [0..1] based on global min/max of the rows that
            // actually have ranges.
            const minStart = Math.min(...rangedRows.map(p => p.start));
            const maxEnd = Math.max(...rangedRows.map(p => p.end));
            const span = Math.max(1e-6, maxEnd - minStart);

            // Time axis — sits below the last bar.
            const axisY = r.y + items.length * (barH + gap) - gap + 4;
            const axisColor = pal.text === '#ffffff' ? '#aaaaaa' : '#666666';
            objects.push({
                _saId: this._id(), _saRole: 'axis', _saIndex: -1,
                type: 'line',
                x: r.x + labelW, y: axisY,
                width: chartW, height: 0,
                stroke: axisColor, strokeWidth: 1, fill: 'transparent'
            });
            const tickCount = 5;
            for (let t = 0; t <= tickCount; t++) {
                const ratio = t / tickCount;
                const tx = r.x + labelW + chartW * ratio;
                const tickVal = minStart + span * ratio;
                let tickLabel;
                if (isDateAxis) {
                    tickLabel = this._formatGanttDate(tickVal, span);
                } else {
                    const numStr = Number.isInteger(minStart) && Number.isInteger(maxEnd)
                        ? String(Math.round(tickVal))
                        : tickVal.toFixed(1);
                    tickLabel = unitInfo.tickSuffix
                        ? `${numStr}${unitInfo.tickSuffix}`
                        : numStr;
                }
                objects.push({
                    _saId: this._id(), _saRole: 'tick', _saIndex: t,
                    type: 'line',
                    x: tx, y: axisY, width: 0, height: 4,
                    stroke: axisColor, strokeWidth: 1, fill: 'transparent'
                });
                objects.push({
                    _saId: this._id(), _saRole: 'tick-label', _saIndex: t,
                    type: 'text',
                    x: tx - 35, y: axisY + 5, width: 70, height: 12,
                    text: tickLabel,
                    textColor: axisColor,
                    fontSize: 9, textAlign: 'center', fontWeight: '500',
                    fill: 'transparent', strokeWidth: 0
                });
            }
            // Axis title (e.g. "Days from symptom onset", "Date", "Weeks")
            if (unitInfo.axisTitle) {
                objects.push({
                    _saId: this._id(), _saRole: 'axis-title', _saIndex: -1,
                    type: 'text',
                    x: r.x + labelW, y: axisY + 16,
                    width: chartW, height: 12,
                    text: unitInfo.axisTitle,
                    textColor: axisColor,
                    fontSize: 9, textAlign: 'center', fontWeight: '600',
                    fill: 'transparent', strokeWidth: 0
                });
            }

            parsed.forEach((p, i) => {
                const { item, start, end } = p;
                const yy = r.y + i * (barH + gap);
                objects.push({
                    _saId: this._id(), _saRole: 'label', _saIndex: i,
                    type: 'text', x: r.x, y: yy, width: labelW - 8, height: barH,
                    text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                    fontSize: Math.min(12, barH * 0.35), textAlign: 'right', fontWeight: '500',
                    fill: 'transparent', strokeWidth: 0
                });
                let barX, barW, barLabel, barFill;
                if (start != null && end != null && end > start) {
                    barX = r.x + labelW + chartW * ((start - minStart) / span);
                    barW = Math.max(2, chartW * ((end - start) / span));
                    barLabel = isDateAxis
                        ? `${this._formatGanttDate(start, span)} – ${this._formatGanttDate(end, span)}`
                        : (unitInfo.tickSuffix
                            ? `${this._formatGanttNumber(start)}${unitInfo.tickSuffix}–${this._formatGanttNumber(end)}${unitInfo.tickSuffix}`
                            : `${this._formatGanttNumber(start)}–${this._formatGanttNumber(end)}`);
                    barFill = pal.colors[i % pal.colors.length];
                } else {
                    // No range data: render a faint placeholder so the row is visible.
                    barX = r.x + labelW + chartW * 0.05;
                    barW = chartW * 0.15;
                    barLabel = 'no data';
                    barFill = pal.colors[i % pal.colors.length] + '40';
                }
                objects.push({
                    _saId: this._id(), _saRole: 'bar', _saIndex: i,
                    type: 'rectangle',
                    x: barX, y: yy + barH * 0.2,
                    width: barW, height: barH * 0.6,
                    fill: barFill,
                    borderRadius: barH * 0.15, strokeWidth: 0,
                    text: barLabel,
                    textColor: pal.text, fontSize: 9, textAlign: 'center', fontWeight: '600'
                });
            });
            return { objects, connections: [] };
        }

        // Fallback (no real start/end pair available): legacy synthetic layout
        items.forEach((item, i) => {
            const yy = r.y + i * (barH + gap);
            const start = (i * 0.15) % 0.5;
            const fallbackWeeks = Math.round((0.3 + (i * 0.08) % 0.5) * 10);
            const durationWeeks = Math.max(1, this._getItemNumericValue(item, fallbackWeeks));
            const dur = Math.max(0.12, Math.min(0.9, durationWeeks / 10));
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: r.x, y: yy, width: labelW - 8, height: barH,
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: Math.min(12, barH * 0.35), textAlign: 'right', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'bar', _saIndex: i,
                type: 'rectangle',
                x: r.x + labelW + chartW * start, y: yy + barH * 0.2,
                width: chartW * dur, height: barH * 0.6,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: barH * 0.15, strokeWidth: 0,
                text: this._getItemSecondaryValue(item, `${durationWeeks} wks`),
                textColor: pal.text, fontSize: 9, textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _formatGanttNumber(n) {
        if (n == null || !Number.isFinite(n)) return '';
        return Number.isInteger(n) ? String(n) : Number(n).toFixed(1);
    }

    /**
     * Best-effort date parser for Gantt cells. Returns ms-since-epoch or null.
     * Accepts ISO (2026-01-15), slash (15/01/2026, 1/15/2026), dotted (15.01.2026),
     * month-name forms (Jan 15 2026, 15 Jan 2026, January 15, 2026), and "YYYY-MM".
     * Bare 4-digit years and bare integers are NOT treated as dates (they belong
     * on the numeric axis).
     */
    _parseGanttDate(raw) {
        if (raw == null) return null;
        const s = String(raw).trim();
        if (!s) return null;
        // Reject anything that is purely a small integer (those are days/weeks).
        if (/^-?\d+(\.\d+)?$/.test(s)) return null;
        // Quick structural checks before handing off to Date.parse to avoid
        // matching things like "Case 1" or "5 wks" that would otherwise resolve.
        const isoLike = /^\d{4}-\d{1,2}(-\d{1,2})?$/.test(s);
        const slashLike = /^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}$/.test(s);
        const monthNameLike = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(s)
            && /\d/.test(s);
        if (!isoLike && !slashLike && !monthNameLike) return null;

        // For DD/MM/YYYY ambiguity we prefer ISO ordering if first part > 12.
        if (slashLike) {
            const parts = s.split(/[\/.\-]/).map(p => parseInt(p, 10));
            let [a, b, c] = parts;
            if (c < 100) c += c < 70 ? 2000 : 1900;
            // Heuristic: if first > 12, must be DD/MM/YYYY; else assume DD/MM/YYYY
            // (ISO style for international users); MM/DD/YYYY users can use ISO.
            const day = a, month = b;
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                const d = new Date(c, month - 1, day);
                return Number.isNaN(d.getTime()) ? null : d.getTime();
            }
        }
        const t = Date.parse(s);
        return Number.isFinite(t) ? t : null;
    }

    _formatGanttDate(ms, spanMs) {
        if (!Number.isFinite(ms)) return '';
        const d = new Date(ms);
        if (Number.isNaN(d.getTime())) return '';
        const dayMs = 86400000;
        // Choose granularity based on total span
        if (spanMs >= 365 * dayMs * 2) {
            // Multi-year: show "MMM YYYY"
            return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        }
        if (spanMs >= 60 * dayMs) {
            // 2+ months: "DD MMM"
            return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
        }
        // Short span: "DD MMM YY" still readable
        return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
    }

    /**
     * Inspect the table headers (set on the templates instance by the importer)
     * to choose an axis title and per-tick suffix for the Gantt chart.
     * Returns { axisTitle, tickSuffix } where tickSuffix is "" or e.g. "d", "w".
     */
    _detectGanttUnit(headers, isDateAxis) {
        if (isDateAxis) return { axisTitle: 'Date', tickSuffix: '' };
        if (!Array.isArray(headers) || !headers.length) {
            return { axisTitle: '', tickSuffix: '' };
        }
        // Skip the first column (it's the row label / task name)
        const valueHeaders = headers.slice(1).filter(Boolean).map(h => String(h));
        const joined = valueHeaders.join(' ').toLowerCase();
        if (!joined.trim()) return { axisTitle: '', tickSuffix: '' };

        // Try to find a meaningful title: prefer the longest header, but strip
        // "start"/"end"/"begin"/"finish"/"recovery" prefixes so we keep the unit.
        const stripPrefix = s => s
            .replace(/\b(start|begin|from|end|finish|recovery|complete|done|to)\b/gi, '')
            .replace(/[():\-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const candidates = valueHeaders.map(stripPrefix).filter(Boolean);
        // Pick the candidate that mentions a known time unit, else the first.
        const unitRx = /\b(day|days|week|weeks|wk|wks|month|months|year|years|yr|yrs|hour|hours|hr|hrs|minute|minutes|min|mins|quarter|quarters|q\d|sprint)\b/i;
        let pick = candidates.find(c => unitRx.test(c)) || candidates[0] || '';
        // Title-case
        pick = pick.replace(/\b\w/g, ch => ch.toUpperCase());

        let suffix = '';
        if (/\b(day|days)\b/i.test(joined)) suffix = 'd';
        else if (/\b(week|weeks|wk|wks)\b/i.test(joined)) suffix = 'w';
        else if (/\b(month|months)\b/i.test(joined)) suffix = 'mo';
        else if (/\b(year|years|yr|yrs)\b/i.test(joined)) suffix = 'y';
        else if (/\b(hour|hours|hr|hrs)\b/i.test(joined)) suffix = 'h';
        else if (/\b(minute|minutes|min|mins)\b/i.test(joined)) suffix = 'm';

        return { axisTitle: pick, tickSuffix: suffix };
    }

    _genSwimlaneProcess(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const lanes = [];
        const laneIndexByName = new Map();
        const normalizedItems = items.map((item, index) => {
            const laneName = this._getItemSecondaryValue(item, '').trim() || `Lane ${index + 1}`;
            if (!laneIndexByName.has(laneName)) {
                laneIndexByName.set(laneName, lanes.length);
                lanes.push(laneName);
            }
            return { item, laneName, laneIndex: laneIndexByName.get(laneName), index };
        });

        const laneLabelW = Math.min(120, r.w * 0.18);
        const laneGap = 10;
        const laneH = (r.h - laneGap * (lanes.length - 1)) / Math.max(1, lanes.length);
        const usableW = r.w - laneLabelW - 18;
        const stepW = usableW / Math.max(1, normalizedItems.length);
        const cardW = Math.min(150, stepW * 0.72);
        const cardH = Math.min(64, laneH * 0.54);

        lanes.forEach((laneName, laneIndex) => {
            const laneY = r.y + laneIndex * (laneH + laneGap);
            objects.push({
                _saId: this._id(), _saRole: 'lane', _saIndex: laneIndex,
                type: 'rectangle', x: r.x, y: laneY,
                width: r.w, height: laneH,
                fill: pal.colors[laneIndex % pal.colors.length] + '0d',
                borderRadius: 14, strokeWidth: 1,
                stroke: pal.colors[laneIndex % pal.colors.length] + '25'
            });
            objects.push({
                _saId: this._id(), _saRole: 'lane-label', _saIndex: laneIndex,
                type: 'rectangle', x: r.x + 8, y: laneY + 8,
                width: laneLabelW - 16, height: laneH - 16,
                fill: pal.colors[laneIndex % pal.colors.length],
                borderRadius: 10, strokeWidth: 0,
                text: laneName, textColor: pal.text,
                fontSize: Math.min(13, laneH * 0.22), textAlign: 'center', fontWeight: '700'
            });
        });

        normalizedItems.forEach(({ item, laneIndex, index }) => {
            const laneY = r.y + laneIndex * (laneH + laneGap);
            const cardX = r.x + laneLabelW + index * stepW + (stepW - cardW) / 2;
            const cardY = laneY + (laneH - cardH) / 2;
            const cardColor = pal.colors[index % pal.colors.length];
            if (index < normalizedItems.length - 1) {
                const nextLaneIndex = normalizedItems[index + 1].laneIndex;
                const nextLaneY = r.y + nextLaneIndex * (laneH + laneGap);
                const nextCardX = r.x + laneLabelW + (index + 1) * stepW + (stepW - cardW) / 2;
                const y1 = cardY + cardH / 2;
                const y2 = nextLaneY + (laneH - cardH) / 2 + cardH / 2;
                objects.push({
                    _saId: this._id(), _saRole: 'connector', _saIndex: index,
                    type: 'line', x: cardX + cardW, y: y1,
                    width: nextCardX - (cardX + cardW), height: y2 - y1,
                    stroke: pal.connector, strokeWidth: 3
                });
            }
            objects.push({
                _saId: this._id(), _saRole: 'task', _saIndex: index,
                type: 'rectangle', x: cardX, y: cardY,
                width: cardW, height: cardH,
                fill: cardColor, borderRadius: 12, strokeWidth: 0,
                text: item.text, textColor: pal.text,
                fontSize: Math.min(13, cardH * 0.28), textAlign: 'center', fontWeight: '600'
            });
        });

        return { objects, connections: [] };
    }

    _genRACIMatrix(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const labels = ['Responsible','Accountable','Consulted','Informed'];
        const gap = 6;
        const halfW = (r.w - gap) / 2;
        const halfH = (r.h - gap) / 2;
        const pos = [[0,0],[1,0],[0,1],[1,1]];
        items.forEach((item, i) => {
            const [c, rw] = pos[i];
            const bx = r.x + c * (halfW + gap);
            const by = r.y + rw * (halfH + gap);
            objects.push({
                _saId: this._id(), _saRole: 'cell', _saIndex: i,
                type: 'rectangle', x: bx, y: by, width: halfW, height: halfH,
                fill: pal.colors[i % pal.colors.length] + '18',
                borderRadius: 10, strokeWidth: 2,
                stroke: pal.colors[i % pal.colors.length]
            });
            objects.push({
                _saId: this._id(), _saRole: 'letter', _saIndex: i,
                type: 'text', x: bx + 8, y: by + 8,
                width: 32, height: 32,
                text: labels[i][0], textColor: pal.colors[i % pal.colors.length],
                fontSize: 24, textAlign: 'center', fontWeight: '700',
                fill: 'transparent', strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'title', _saIndex: i,
                type: 'text', x: bx + 10, y: by + 42,
                width: halfW - 20, height: 20,
                text: labels[i], textColor: pal.colors[i % pal.colors.length],
                fontSize: 12, textAlign: 'left', fontWeight: '700',
                fill: 'transparent', strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'content', _saIndex: i,
                type: 'text', x: bx + 10, y: by + 66,
                width: halfW - 20, height: halfH - 76,
                text: item.text, textColor: pal.text === '#ffffff' ? '#bbbbbb' : '#555555',
                fontSize: 10, textAlign: 'left', fontWeight: '400',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genRiskMatrix(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const gap = 4;
        const halfW = (r.w - gap) / 2;
        const halfH = (r.h - gap) / 2;
        const riskColors = ['#22c55e','#f59e0b','#f59e0b','#ef4444'];
        const riskLabels = ['Low Risk','Medium Risk','Medium Risk','High Risk'];
        const pos = [[0,0],[1,0],[0,1],[1,1]];
        items.forEach((item, i) => {
            const [c, rw] = pos[i];
            objects.push({
                _saId: this._id(), _saRole: 'cell', _saIndex: i,
                type: 'rectangle',
                x: r.x + c * (halfW + gap), y: r.y + rw * (halfH + gap),
                width: halfW, height: halfH,
                fill: riskColors[i] + '20', borderRadius: 8,
                strokeWidth: 2, stroke: riskColors[i],
                text: `${riskLabels[i]}\n${item.text}`,
                textColor: riskColors[i], fontSize: 12, textAlign: 'center', fontWeight: '600'
            });
        });
        // Axis labels
        objects.push({
            _saId: this._id(), _saRole: 'axis-label', _saIndex: -1,
            type: 'text', x: r.x - 5, y: r.y + r.h / 2 - 10,
            width: 30, height: 20,
            text: '← Impact', textColor: pal.connector,
            fontSize: 9, textAlign: 'center', fontWeight: '500',
            fill: 'transparent', strokeWidth: 0
        });
        return { objects, connections: [] };
    }

    _genStakeholderMap(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const gap = 4;
        const halfW = (r.w - gap) / 2;
        const halfH = (r.h - gap) / 2;
        const quadLabels = ['Keep Satisfied','Manage Closely','Monitor','Keep Informed'];
        const pos = [[0,0],[1,0],[0,1],[1,1]];
        items.forEach((item, i) => {
            const [c, rw] = pos[i];
            const bx = r.x + c * (halfW + gap);
            const by = r.y + rw * (halfH + gap);
            objects.push({
                _saId: this._id(), _saRole: 'quad', _saIndex: i,
                type: 'rectangle', x: bx, y: by, width: halfW, height: halfH,
                fill: pal.colors[i % pal.colors.length] + '15',
                borderRadius: 8, strokeWidth: 1,
                stroke: pal.colors[i % pal.colors.length] + '50'
            });
            objects.push({
                _saId: this._id(), _saRole: 'quad-label', _saIndex: i,
                type: 'text', x: bx + 8, y: by + 8,
                width: halfW - 16, height: 20,
                text: quadLabels[i], textColor: pal.colors[i % pal.colors.length],
                fontSize: 10, textAlign: 'left', fontWeight: '700',
                fill: 'transparent', strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'content', _saIndex: i,
                type: 'text', x: bx + 8, y: by + 32,
                width: halfW - 16, height: halfH - 40,
                text: item.text, textColor: pal.text === '#ffffff' ? '#bbbbbb' : '#555555',
                fontSize: 11, textAlign: 'center', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genDecisionTree(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const nodeW = r.w * 0.22;
        const nodeH = r.h * 0.16;
        // Root
        objects.push({
            _saId: this._id(), _saRole: 'root', _saIndex: 0,
            type: 'diamond', x: r.x + r.w / 2 - nodeW / 2, y: r.y,
            width: nodeW, height: nodeH,
            fill: pal.colors[0], strokeWidth: 0,
            text: items[0]?.text || '?', textColor: pal.text,
            fontSize: 11, textAlign: 'center', fontWeight: '700'
        });
        // Branch nodes
        const branches = items.slice(1);
        const level1Count = Math.min(branches.length, 2);
        const level2Count = branches.length - level1Count;
        for (let i = 0; i < level1Count; i++) {
            const bx = r.x + (i === 0 ? r.w * 0.15 : r.w * 0.65);
            const by = r.y + r.h * 0.35;
            objects.push({
                _saId: this._id(), _saRole: 'branch', _saIndex: i + 1,
                type: 'rectangle', x: bx, y: by, width: nodeW, height: nodeH,
                fill: pal.colors[(i + 1) % pal.colors.length],
                borderRadius: 8, strokeWidth: 0,
                text: branches[i].text, textColor: pal.text,
                fontSize: 10, textAlign: 'center', fontWeight: '600'
            });
            // Connector
            objects.push({
                _saId: this._id(), _saRole: 'link', _saIndex: i,
                type: 'line',
                x: r.x + r.w / 2, y: r.y + nodeH,
                width: bx + nodeW / 2 - r.x - r.w / 2, height: by - r.y - nodeH,
                stroke: pal.connector, strokeWidth: 2
            });
        }
        // Level 2 leaves
        for (let i = 0; i < level2Count; i++) {
            const parentIdx = i % level1Count;
            const parentX = parentIdx === 0 ? r.w * 0.15 : r.w * 0.65;
            const spread = (i % 2 === 0 ? -1 : 1) * r.w * 0.12;
            const bx = r.x + parentX + spread;
            const by = r.y + r.h * 0.68;
            objects.push({
                _saId: this._id(), _saRole: 'leaf', _saIndex: level1Count + i + 1,
                type: 'rectangle', x: bx, y: by, width: nodeW * 0.9, height: nodeH,
                fill: pal.colors[(level1Count + i + 1) % pal.colors.length] + '80',
                borderRadius: 8, strokeWidth: 1,
                stroke: pal.colors[(level1Count + i + 1) % pal.colors.length],
                text: branches[level1Count + i].text, textColor: pal.text === '#ffffff' ? '#dddddd' : '#333333',
                fontSize: 10, textAlign: 'center', fontWeight: '500'
            });
        }
        return { objects, connections: [] };
    }

    _genWBS(items, pal, sw, sh) {
        if (this._hasImportedHierarchy(items)) return this._genImportedHierarchy(items, pal, sw, sh, { showLevelLabels: true });
        const r = this._region(sw, sh);
        const objects = [];
        const nodeW = r.w * 0.2;
        const nodeH = r.h * 0.15;
        // Root at top
        objects.push({
            _saId: this._id(), _saRole: 'root', _saIndex: 0,
            type: 'rectangle',
            x: r.x + r.w / 2 - nodeW / 2, y: r.y,
            width: nodeW, height: nodeH,
            fill: pal.colors[0], borderRadius: 8, strokeWidth: 0,
            text: items[0]?.text || 'Project', textColor: pal.text,
            fontSize: 12, textAlign: 'center', fontWeight: '700'
        });
        // Children spread below
        const children = items.slice(1);
        const childW = Math.min(nodeW, (r.w - 10 * children.length) / children.length);
        const startX = r.x + (r.w - (childW * children.length + 10 * (children.length - 1))) / 2;
        children.forEach((item, i) => {
            const bx = startX + i * (childW + 10);
            const by = r.y + r.h * 0.4;
            objects.push({
                _saId: this._id(), _saRole: 'link', _saIndex: i + 1,
                type: 'line',
                x: r.x + r.w / 2, y: r.y + nodeH,
                width: bx + childW / 2 - r.x - r.w / 2, height: by - r.y - nodeH,
                stroke: pal.connector, strokeWidth: 2
            });
            objects.push({
                _saId: this._id(), _saRole: 'child', _saIndex: i + 1,
                type: 'rectangle', x: bx, y: by,
                width: childW, height: nodeH,
                fill: pal.colors[(i + 1) % pal.colors.length],
                borderRadius: 6, strokeWidth: 0,
                text: item.text, textColor: pal.text,
                fontSize: Math.min(10, childW * 0.1), textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    // ======= TECHNOLOGY generators =======

    _genUserFlow(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const nodeW = r.w * 0.18;
        const nodeH = r.h * 0.2;
        const gap = (r.w - nodeW * items.length) / (items.length - 1);
        items.forEach((item, i) => {
            const bx = r.x + i * (nodeW + gap);
            const by = r.y + (r.h - nodeH) / 2;
            const shape = i === 0 || i === items.length - 1 ? 'circle' : (i % 2 === 0 ? 'diamond' : 'rectangle');
            objects.push({
                _saId: this._id(), _saRole: 'node', _saIndex: i,
                type: shape, x: bx, y: by, width: nodeW, height: nodeH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: shape === 'rectangle' ? 8 : 0, strokeWidth: 0,
                text: item.text, textColor: pal.text,
                fontSize: Math.min(11, nodeW * 0.1), textAlign: 'center', fontWeight: '600'
            });
            if (i < items.length - 1) {
                objects.push({
                    _saId: this._id(), _saRole: 'arrow', _saIndex: i,
                    type: 'arrow',
                    x: bx + nodeW + 4, y: by + nodeH / 2 - 8,
                    width: gap - 8, height: 16,
                    fill: pal.connector, strokeWidth: 0
                });
            }
        });
        return { objects, connections: [] };
    }

    _genAPIArchitecture(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const layerH = (r.h - 16 * (items.length - 1)) / items.length;
        items.forEach((item, i) => {
            const indent = i * 20;
            objects.push({
                _saId: this._id(), _saRole: 'layer', _saIndex: i,
                type: 'rectangle',
                x: r.x + indent, y: r.y + i * (layerH + 16),
                width: r.w - indent * 2, height: layerH,
                fill: pal.colors[i % pal.colors.length] + '20',
                borderRadius: 10, strokeWidth: 2,
                stroke: pal.colors[i % pal.colors.length],
                text: item.text, textColor: pal.colors[i % pal.colors.length],
                fontSize: Math.min(14, layerH * 0.3), textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genDevOpsPipeline(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const stepW = r.w / items.length;
        const pipeH = r.h * 0.4;
        const pipeY = r.y + (r.h - pipeH) / 2;
        items.forEach((item, i) => {
            const bx = r.x + i * stepW;
            objects.push({
                _saId: this._id(), _saRole: 'pipe', _saIndex: i,
                type: 'rectangle', x: bx + 2, y: pipeY,
                width: stepW - 4, height: pipeH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 6, strokeWidth: 0,
                text: item.text, textColor: pal.text,
                fontSize: Math.min(12, stepW * 0.1), textAlign: 'center', fontWeight: '600'
            });
            // Arrow connector
            if (i < items.length - 1) {
                objects.push({
                    _saId: this._id(), _saRole: 'connector', _saIndex: i,
                    type: 'text', x: bx + stepW - 10, y: pipeY + pipeH / 2 - 10,
                    width: 20, height: 20,
                    text: '→', textColor: '#ffffff',
                    fontSize: 16, textAlign: 'center', fontWeight: '700',
                    fill: 'transparent', strokeWidth: 0
                });
            }
        });
        return { objects, connections: [] };
    }

    _genCloudArchitecture(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const layerH = (r.h - 10 * (items.length - 1)) / items.length;
        items.forEach((item, i) => {
            objects.push({
                _saId: this._id(), _saRole: 'cloud-layer', _saIndex: i,
                type: 'rectangle',
                x: r.x, y: r.y + i * (layerH + 10),
                width: r.w, height: layerH,
                fill: pal.colors[i % pal.colors.length] + '15',
                borderRadius: layerH * 0.3, strokeWidth: 2,
                stroke: pal.colors[i % pal.colors.length],
                text: item.text, textColor: pal.colors[i % pal.colors.length],
                fontSize: Math.min(15, layerH * 0.3), textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genDatabaseSchema(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const cols = Math.min(items.length, 3);
        const rows = Math.ceil(items.length / cols);
        const gap = 16;
        const cw = (r.w - gap * (cols - 1)) / cols;
        const ch = (r.h - gap * (rows - 1)) / rows;
        const headerH = 28;
        items.forEach((item, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const bx = r.x + col * (cw + gap);
            const by = r.y + row * (ch + gap);
            // Table header
            objects.push({
                _saId: this._id(), _saRole: 'table-header', _saIndex: i,
                type: 'rectangle', x: bx, y: by, width: cw, height: headerH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 6, strokeWidth: 0,
                text: item.text, textColor: pal.text,
                fontSize: 11, textAlign: 'center', fontWeight: '700'
            });
            // Table body
            objects.push({
                _saId: this._id(), _saRole: 'table-body', _saIndex: i,
                type: 'rectangle', x: bx, y: by + headerH,
                width: cw, height: ch - headerH,
                fill: pal.colors[i % pal.colors.length] + '08',
                borderRadius: 0, strokeWidth: 1,
                stroke: pal.colors[i % pal.colors.length] + '30',
                text: 'id\nname\ncreated_at', textColor: pal.text === '#ffffff' ? '#aaaaaa' : '#666666',
                fontSize: 9, textAlign: 'left', fontWeight: '400'
            });
        });
        return { objects, connections: [] };
    }

    // ======= FINANCE generators =======

    _genBudgetPlanner(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const ratios = this._getWeightedRatios(items, Array.from({ length: items.length }, () => 1 / Math.max(1, items.length)));
        let currentX = r.x;
        const barH = r.h * 0.35;
        const barY = r.y + r.h * 0.25;
        items.forEach((item, i) => {
            const pct = ratios[i] || 0;
            const segW = r.w * pct;
            objects.push({
                _saId: this._id(), _saRole: 'segment', _saIndex: i,
                type: 'rectangle', x: currentX, y: barY,
                width: segW - 2, height: barH,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: i === 0 ? 8 : (i === items.length - 1 ? 8 : 0),
                strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: currentX, y: barY + barH + 10,
                width: segW, height: 20,
                text: item.text, textColor: pal.colors[i % pal.colors.length],
                fontSize: Math.min(11, segW * 0.14), textAlign: 'center', fontWeight: '600',
                fill: 'transparent', strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'value', _saIndex: i,
                type: 'text', x: currentX, y: barY + barH + 28,
                width: segW, height: 18,
                text: this._getItemSecondaryValue(item, `${Math.round(pct * 100)}%`), textColor: pal.text === '#ffffff' ? '#aaaaaa' : '#888888',
                fontSize: 10, textAlign: 'center', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
            currentX += segW;
        });
        return { objects, connections: [] };
    }

    _genPnLStatement(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const headerH = 40;
        objects.push({
            _saId: this._id(), _saRole: 'title', _saIndex: -1,
            type: 'rectangle', x: r.x, y: r.y, width: r.w, height: headerH,
            fill: pal.colors[0], borderRadius: 8, strokeWidth: 0,
            text: 'Profit & Loss', textColor: pal.text,
            fontSize: 16, textAlign: 'center', fontWeight: '700'
        });
        const gap = 6;
        const rowH = (r.h - headerH - gap * items.length) / items.length;
        items.forEach((item, i) => {
            const yy = r.y + headerH + gap + i * (rowH + gap);
            const fallbackAmount = i % 2 === 0 ? `+$${(i + 1) * 12}K` : `-$${(i + 1) * 5}K`;
            const amountText = this._getItemSecondaryValue(item, fallbackAmount);
            const amountNumeric = this._getItemNumericValue(item, null);
            const isPositive = amountNumeric != null ? amountNumeric >= 0 : !/^\s*-/.test(amountText);
            objects.push({
                _saId: this._id(), _saRole: 'row', _saIndex: i,
                type: 'rectangle', x: r.x, y: yy, width: r.w, height: rowH,
                fill: isPositive ? '#22c55e15' : '#ef444415',
                borderRadius: 6, strokeWidth: 1,
                stroke: isPositive ? '#22c55e40' : '#ef444440',
                text: item.text, textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: Math.min(13, rowH * 0.35), textAlign: 'left', fontWeight: '500'
            });
            objects.push({
                _saId: this._id(), _saRole: 'amount', _saIndex: i,
                type: 'text', x: r.x + r.w * 0.65, y: yy,
                width: r.w * 0.3, height: rowH,
                text: amountText,
                textColor: isPositive ? '#22c55e' : '#ef4444',
                fontSize: Math.min(14, rowH * 0.35), textAlign: 'right', fontWeight: '700',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }

    _genInvestmentPortfolio(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const chartW = r.w * 0.6;
        const legendX = r.x + chartW + 20;
        const barTotalH = r.h;
        const ratios = this._getWeightedRatios(items, Array.from({ length: items.length }, () => 1 / Math.max(1, items.length)));
        let currentY = r.y;
        items.forEach((item, i) => {
            const pct = ratios[i] || 0;
            const segH = barTotalH * pct;
            objects.push({
                _saId: this._id(), _saRole: 'segment', _saIndex: i,
                type: 'rectangle', x: r.x + chartW * 0.15, y: currentY,
                width: chartW * 0.7, height: segH - 3,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 4, strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'legend-dot', _saIndex: i,
                type: 'rectangle', x: legendX, y: currentY + segH / 2 - 8,
                width: 16, height: 16,
                fill: pal.colors[i % pal.colors.length],
                borderRadius: 4, strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'legend', _saIndex: i,
                type: 'text', x: legendX + 22, y: currentY + segH / 2 - 10,
                width: r.w - chartW - 45, height: 20,
                text: `${item.text} (${this._getItemSecondaryValue(item, `${Math.round(pct * 100)}%`)})`,
                textColor: pal.text === '#ffffff' ? '#cccccc' : '#333333',
                fontSize: 11, textAlign: 'left', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
            currentY += segH;
        });
        return { objects, connections: [] };
    }

    _genCostBenefit(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const objects = [];
        const gap = 8;
        const halfW = (r.w - gap) / 2;
        const halfH = (r.h - gap) / 2;
        const labels = ['High Benefit\nLow Cost', 'High Benefit\nHigh Cost', 'Low Benefit\nLow Cost', 'Low Benefit\nHigh Cost'];
        const pos = [[0,0],[1,0],[0,1],[1,1]];
        const cellColors = ['#22c55e','#f59e0b','#3b82f6','#ef4444'];
        items.forEach((item, i) => {
            const [c, rw] = pos[i];
            objects.push({
                _saId: this._id(), _saRole: 'quad', _saIndex: i,
                type: 'rectangle',
                x: r.x + c * (halfW + gap), y: r.y + rw * (halfH + gap),
                width: halfW, height: halfH,
                fill: cellColors[i] + '18', borderRadius: 10,
                strokeWidth: 2, stroke: cellColors[i],
                text: `${labels[i]}\n${item.text}`, textColor: cellColors[i],
                fontSize: 11, textAlign: 'center', fontWeight: '600'
            });
        });
        return { objects, connections: [] };
    }

    _genFinancialRatios(items, pal, sw, sh) {
        const r = this._region(sw, sh);
        const cols = Math.min(items.length, 2);
        const rows = Math.ceil(items.length / cols);
        const gap = 10;
        const cw = (r.w - gap * (cols - 1)) / cols;
        const ch = (r.h - gap * (rows - 1)) / rows;
        const objects = [];
        const sampleValues = this.getDefaultSecondaryValues('financial-ratios', items.length);
        items.forEach((item, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const bx = r.x + col * (cw + gap);
            const by = r.y + row * (ch + gap);
            objects.push({
                _saId: this._id(), _saRole: 'card', _saIndex: i,
                type: 'rectangle', x: bx, y: by, width: cw, height: ch,
                fill: pal.colors[i % pal.colors.length] + '12',
                borderRadius: 12, strokeWidth: 2,
                stroke: pal.colors[i % pal.colors.length] + '40'
            });
            objects.push({
                _saId: this._id(), _saRole: 'value', _saIndex: i,
                type: 'text', x: bx + 10, y: by + ch * 0.12,
                width: cw - 20, height: ch * 0.45,
                text: this._getItemSecondaryValue(item, sampleValues[i] || '0.0'), textColor: pal.colors[i % pal.colors.length],
                fontSize: Math.min(24, ch * 0.25), textAlign: 'center', fontWeight: '700',
                fill: 'transparent', strokeWidth: 0
            });
            objects.push({
                _saId: this._id(), _saRole: 'label', _saIndex: i,
                type: 'text', x: bx + 10, y: by + ch * 0.58,
                width: cw - 20, height: ch * 0.3,
                text: item.text, textColor: pal.text === '#ffffff' ? '#aaaaaa' : '#666666',
                fontSize: Math.min(11, cw * 0.08), textAlign: 'center', fontWeight: '500',
                fill: 'transparent', strokeWidth: 0
            });
        });
        return { objects, connections: [] };
    }
}
