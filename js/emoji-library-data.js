(function(global) {
    const categories = [
        { id: 'smileys-people', label: 'Smileys & People' },
        { id: 'animals-nature', label: 'Animals & Nature' },
        { id: 'food-drink', label: 'Food & Drink' },
        { id: 'activity', label: 'Activity' },
        { id: 'travel-places', label: 'Travel & Places' },
        { id: 'objects', label: 'Objects' },
        { id: 'symbols', label: 'Symbols' },
        { id: 'flags', label: 'Flags' }
    ];

    const rawItems = {
        'smileys-people': [
            ['grinning-face', '😀', 'Grinning Face', 'happy smile cheerful'],
            ['beaming-face', '😁', 'Beaming Face', 'happy grin teeth'],
            ['grinning-squinting-face', '😆', 'Grinning Squinting Face', 'laugh excited'],
            ['rolling-on-floor-laughing', '🤣', 'Rolling on the Floor Laughing', 'laugh funny rofl'],
            ['tears-of-joy', '😂', 'Face With Tears of Joy', 'laugh funny'],
            ['slightly-smiling-face', '🙂', 'Slightly Smiling Face', 'smile polite'],
            ['upside-down-face', '🙃', 'Upside Down Face', 'silly sarcasm'],
            ['winking-face', '😉', 'Winking Face', 'wink playful'],
            ['smiling-eyes', '😊', 'Smiling Face', 'kind soft'],
            ['smiling-halo', '😇', 'Smiling Face With Halo', 'angel good halo'],
            ['heart-eyes', '😍', 'Heart Eyes', 'love adore'],
            ['star-struck', '🤩', 'Star Struck', 'wow amazed'],
            ['kissing-heart', '😘', 'Face Blowing a Kiss', 'kiss love'],
            ['kissing-face', '😗', 'Kissing Face', 'kiss'],
            ['yum-face', '😋', 'Yum Face', 'tasty delicious'],
            ['tongue-face', '😛', 'Face With Tongue', 'playful tongue'],
            ['zany-face', '🤪', 'Zany Face', 'silly crazy'],
            ['sunglasses', '😎', 'Sunglasses Face', 'cool confident'],
            ['thinking', '🤔', 'Thinking Face', 'question idea'],
            ['shushing-face', '🤫', 'Shushing Face', 'quiet secret'],
            ['zipper-mouth', '🤐', 'Zipper Mouth Face', 'secret silent'],
            ['neutral-face', '😐', 'Neutral Face', 'meh blank'],
            ['expressionless-face', '😑', 'Expressionless Face', 'blank unimpressed'],
            ['unamused-face', '😒', 'Unamused Face', 'annoyed'],
            ['rolling-eyes', '🙄', 'Face With Rolling Eyes', 'eyeroll'],
            ['grimacing-face', '😬', 'Grimacing Face', 'awkward'],
            ['relieved-face', '😌', 'Relieved Face', 'calm'],
            ['pensive-face', '😔', 'Pensive Face', 'sad thoughtful'],
            ['sleeping', '😴', 'Sleeping Face', 'rest tired'],
            ['drooling-face', '🤤', 'Drooling Face', 'hungry desire'],
            ['mask-face', '😷', 'Face With Medical Mask', 'sick health'],
            ['thermometer-face', '🤒', 'Face With Thermometer', 'sick fever'],
            ['nauseated-face', '🤢', 'Nauseated Face', 'sick disgust'],
            ['hot-face', '🥵', 'Hot Face', 'heat sweating'],
            ['cold-face', '🥶', 'Cold Face', 'freezing cold'],
            ['dizzy-face', '😵', 'Dizzy Face', 'shocked dizzy'],
            ['party-face', '🥳', 'Party Face', 'celebrate confetti'],
            ['cowboy-face', '🤠', 'Cowboy Face', 'hat western'],
            ['pleading-face', '🥺', 'Pleading Face', 'please sad cute'],
            ['crying-face', '😢', 'Crying Face', 'sad tear'],
            ['loudly-crying-face', '😭', 'Loudly Crying Face', 'cry sob'],
            ['fearful-face', '😨', 'Fearful Face', 'scared'],
            ['screaming-face', '😱', 'Face Screaming in Fear', 'shock scared'],
            ['angry-face', '😠', 'Angry Face', 'mad'],
            ['pouting-face', '😡', 'Pouting Face', 'rage angry'],
            ['skull', '💀', 'Skull', 'dead danger'],
            ['ghost', '👻', 'Ghost', 'spooky halloween'],
            ['alien', '👽', 'Alien', 'space ufo'],
            ['robot', '🤖', 'Robot', 'bot technology'],
            ['poop', '💩', 'Pile of Poo', 'funny poop'],
            ['clown-face', '🤡', 'Clown Face', 'circus funny'],
            ['waving-hand', '👋', 'Waving Hand', 'hello greet'],
            ['raised-hand', '✋', 'Raised Hand', 'stop hand'],
            ['ok-hand', '👌', 'OK Hand', 'perfect ok'],
            ['thumbs-up', '👍', 'Thumbs Up', 'like approve'],
            ['thumbs-down', '👎', 'Thumbs Down', 'dislike'],
            ['clapping-hands', '👏', 'Clapping Hands', 'applause'],
            ['raising-hands', '🙌', 'Raising Hands', 'celebrate hands'],
            ['handshake', '🤝', 'Handshake', 'agreement'],
            ['folded-hands', '🙏', 'Folded Hands', 'please thanks prayer'],
            ['flexed-biceps', '💪', 'Flexed Biceps', 'strong power'],
            ['eyes', '👀', 'Eyes', 'look watch'],
            ['eye', '👁️', 'Eye', 'look view'],
            ['brain', '🧠', 'Brain', 'mind idea'],
            ['person', '🧑', 'Person', 'human'],
            ['man', '👨', 'Man', 'male person'],
            ['woman', '👩', 'Woman', 'female person'],
            ['baby', '👶', 'Baby', 'child infant'],
            ['child', '🧒', 'Child', 'kid'],
            ['older-person', '🧓', 'Older Person', 'elder'],
            ['artist', '👩‍🎨', 'Artist', 'paint creative person'],
            ['technologist', '👨‍💻', 'Technologist', 'computer developer person'],
            ['teacher', '🧑‍🏫', 'Teacher', 'class learning person'],
            ['doctor', '🧑‍⚕️', 'Doctor', 'health medical person'],
            ['judge', '🧑‍⚖️', 'Judge', 'law person'],
            ['pilot', '🧑‍✈️', 'Pilot', 'airplane person'],
            ['astronaut', '🧑‍🚀', 'Astronaut', 'space person'],
            ['superhero', '🦸', 'Superhero', 'hero person'],
            ['dancer', '🕺', 'Dancer', 'dance movement'],
            ['person-dancing', '💃', 'Woman Dancing', 'dance movement'],
            ['person-running', '🏃', 'Person Running', 'run'],
            ['person-walking', '🚶', 'Person Walking', 'walk'],
            ['family', '👨‍👩‍👧', 'Family', 'people family']
        ],
        'animals-nature': [
            ['dog', '🐶', 'Dog Face', 'pet puppy'],
            ['cat', '🐱', 'Cat Face', 'pet kitten'],
            ['mouse', '🐭', 'Mouse Face', 'small animal'],
            ['hamster', '🐹', 'Hamster Face', 'pet animal'],
            ['rabbit', '🐰', 'Rabbit Face', 'bunny'],
            ['fox', '🦊', 'Fox', 'wild animal'],
            ['bear', '🐻', 'Bear', 'wild animal'],
            ['lion', '🦁', 'Lion', 'wild animal'],
            ['tiger', '🐯', 'Tiger Face', 'wild animal'],
            ['cow', '🐮', 'Cow Face', 'farm animal'],
            ['pig', '🐷', 'Pig Face', 'farm animal'],
            ['frog', '🐸', 'Frog Face', 'amphibian'],
            ['monkey', '🐵', 'Monkey Face', 'animal'],
            ['panda', '🐼', 'Panda', 'bear animal'],
            ['chicken', '🐔', 'Chicken', 'bird farm'],
            ['penguin', '🐧', 'Penguin', 'bird cold'],
            ['bird', '🐦', 'Bird', 'fly'],
            ['duck', '🦆', 'Duck', 'bird water'],
            ['eagle', '🦅', 'Eagle', 'bird'],
            ['owl', '🦉', 'Owl', 'bird night'],
            ['bat', '🦇', 'Bat', 'night animal'],
            ['wolf', '🐺', 'Wolf', 'wild animal'],
            ['boar', '🐗', 'Boar', 'wild animal'],
            ['horse', '🐴', 'Horse Face', 'animal ride'],
            ['unicorn', '🦄', 'Unicorn', 'magic animal'],
            ['bee', '🐝', 'Bee', 'insect honey'],
            ['bug', '🐛', 'Bug', 'insect'],
            ['lady-beetle', '🐞', 'Lady Beetle', 'insect'],
            ['cricket', '🦗', 'Cricket', 'insect'],
            ['spider', '🕷️', 'Spider', 'insect web'],
            ['scorpion', '🦂', 'Scorpion', 'desert'],
            ['turtle', '🐢', 'Turtle', 'reptile'],
            ['snake', '🐍', 'Snake', 'reptile'],
            ['lizard', '🦎', 'Lizard', 'reptile'],
            ['octopus', '🐙', 'Octopus', 'sea animal'],
            ['fish', '🐠', 'Tropical Fish', 'water sea'],
            ['blowfish', '🐡', 'Blowfish', 'sea animal'],
            ['dolphin', '🐬', 'Dolphin', 'sea animal'],
            ['whale', '🐳', 'Whale', 'sea animal'],
            ['crocodile', '🐊', 'Crocodile', 'reptile'],
            ['leopard', '🐆', 'Leopard', 'wild animal'],
            ['elephant', '🐘', 'Elephant', 'wild animal'],
            ['gorilla', '🦍', 'Gorilla', 'ape animal'],
            ['zebra', '🦓', 'Zebra', 'wild animal'],
            ['giraffe', '🦒', 'Giraffe', 'wild animal'],
            ['camel', '🐫', 'Camel', 'desert animal'],
            ['kangaroo', '🦘', 'Kangaroo', 'animal'],
            ['peacock', '🦚', 'Peacock', 'bird animal'],
            ['parrot', '🦜', 'Parrot', 'bird animal'],
            ['butterfly', '🦋', 'Butterfly', 'insect wings'],
            ['sun', '🌞', 'Sun Face', 'day bright'],
            ['sunny', '☀️', 'Sun', 'weather bright'],
            ['moon', '🌙', 'Crescent Moon', 'night'],
            ['full-moon', '🌕', 'Full Moon', 'night'],
            ['star-nature', '🌟', 'Glowing Star', 'shine night'],
            ['cloud', '☁️', 'Cloud', 'weather sky'],
            ['rain', '🌧️', 'Rain Cloud', 'weather water'],
            ['snowflake', '❄️', 'Snowflake', 'winter cold'],
            ['zap', '⚡', 'Lightning', 'electric weather'],
            ['comet', '☄️', 'Comet', 'space'],
            ['fire-nature', '🔥', 'Fire', 'hot flame'],
            ['rainbow', '🌈', 'Rainbow', 'color sky'],
            ['rose', '🌹', 'Rose', 'flower love'],
            ['hibiscus', '🌺', 'Hibiscus', 'flower'],
            ['sunflower', '🌻', 'Sunflower', 'flower yellow'],
            ['blossom', '🌼', 'Blossom', 'flower'],
            ['tulip', '🌷', 'Tulip', 'flower'],
            ['seedling', '🌱', 'Seedling', 'plant grow'],
            ['herb', '🌿', 'Herb', 'plant leaf'],
            ['shamrock', '☘️', 'Shamrock', 'plant lucky'],
            ['fallen-leaf', '🍂', 'Fallen Leaf', 'autumn'],
            ['maple-leaf', '🍁', 'Maple Leaf', 'autumn canada'],
            ['tree', '🌳', 'Tree', 'plant nature'],
            ['evergreen-tree', '🌲', 'Evergreen Tree', 'plant nature'],
            ['cactus', '🌵', 'Cactus', 'desert plant'],
            ['earth-africa', '🌍', 'Earth Africa Europe', 'world globe'],
            ['wave', '🌊', 'Wave', 'water ocean']
        ],
        'food-drink': [
            ['apple', '🍎', 'Red Apple', 'fruit healthy'],
            ['green-apple', '🍏', 'Green Apple', 'fruit healthy'],
            ['banana', '🍌', 'Banana', 'fruit yellow'],
            ['orange', '🍊', 'Orange', 'fruit citrus'],
            ['lemon', '🍋', 'Lemon', 'fruit citrus'],
            ['watermelon', '🍉', 'Watermelon', 'fruit'],
            ['grapes', '🍇', 'Grapes', 'fruit'],
            ['pizza', '🍕', 'Pizza', 'food slice'],
            ['burger', '🍔', 'Burger', 'food sandwich'],
            ['fries', '🍟', 'French Fries', 'food fast'],
            ['hotdog', '🌭', 'Hot Dog', 'food'],
            ['taco', '🌮', 'Taco', 'food'],
            ['burrito', '🌯', 'Burrito', 'food'],
            ['sandwich', '🥪', 'Sandwich', 'food'],
            ['egg', '🥚', 'Egg', 'food'],
            ['cooking', '🍳', 'Cooking', 'egg pan'],
            ['bread', '🍞', 'Bread', 'food'],
            ['croissant', '🥐', 'Croissant', 'food pastry'],
            ['cheese', '🧀', 'Cheese', 'food'],
            ['meat', '🥩', 'Cut of Meat', 'food steak'],
            ['poultry-leg', '🍗', 'Poultry Leg', 'food chicken'],
            ['sushi', '🍣', 'Sushi', 'food japanese'],
            ['ramen', '🍜', 'Ramen', 'food noodles'],
            ['rice', '🍚', 'Rice', 'food'],
            ['spaghetti', '🍝', 'Spaghetti', 'food pasta'],
            ['salad', '🥗', 'Green Salad', 'food healthy'],
            ['popcorn', '🍿', 'Popcorn', 'snack movie'],
            ['cake', '🍰', 'Cake', 'dessert birthday'],
            ['birthday-cake', '🎂', 'Birthday Cake', 'dessert birthday'],
            ['ice-cream', '🍨', 'Ice Cream', 'dessert'],
            ['soft-ice-cream', '🍦', 'Soft Ice Cream', 'dessert'],
            ['cookie', '🍪', 'Cookie', 'dessert'],
            ['coffee', '☕', 'Coffee', 'drink cup'],
            ['tea', '🍵', 'Tea', 'drink cup'],
            ['beer', '🍺', 'Beer Mug', 'drink'],
            ['wine', '🍷', 'Wine Glass', 'drink'],
            ['cocktail', '🍸', 'Cocktail', 'drink'],
            ['tropical-drink', '🍹', 'Tropical Drink', 'drink'],
            ['baby-bottle', '🍼', 'Baby Bottle', 'drink'],
            ['cup-with-straw', '🥤', 'Cup With Straw', 'drink'],
            ['doughnut', '🍩', 'Doughnut', 'dessert sweet'],
            ['strawberry', '🍓', 'Strawberry', 'fruit red']
        ],
        activity: [
            ['soccer', '⚽', 'Soccer Ball', 'football sport'],
            ['basketball', '🏀', 'Basketball', 'sport'],
            ['football', '🏈', 'American Football', 'sport'],
            ['baseball', '⚾', 'Baseball', 'sport'],
            ['softball', '🥎', 'Softball', 'sport'],
            ['tennis', '🎾', 'Tennis', 'sport racket'],
            ['volleyball', '🏐', 'Volleyball', 'sport'],
            ['rugby', '🏉', 'Rugby Football', 'sport'],
            ['pool-8-ball', '🎱', 'Pool 8 Ball', 'game'],
            ['ping-pong', '🏓', 'Ping Pong', 'sport'],
            ['badminton', '🏸', 'Badminton', 'sport'],
            ['boxing-glove', '🥊', 'Boxing Glove', 'sport fight'],
            ['martial-arts', '🥋', 'Martial Arts Uniform', 'sport'],
            ['goal-net', '🥅', 'Goal Net', 'sport'],
            ['golf', '⛳', 'Golf Flag', 'sport'],
            ['ice-skate', '⛸️', 'Ice Skate', 'sport winter'],
            ['fishing-pole', '🎣', 'Fishing Pole', 'activity'],
            ['running-shirt', '🎽', 'Running Shirt', 'sport'],
            ['skis', '🎿', 'Skis', 'sport winter'],
            ['sled', '🛷', 'Sled', 'sport winter'],
            ['curling-stone', '🥌', 'Curling Stone', 'sport'],
            ['dart', '🎯', 'Bullseye', 'target game'],
            ['yo-yo', '🪀', 'Yo Yo', 'toy game'],
            ['kite', '🪁', 'Kite', 'toy activity'],
            ['gamepad', '🎮', 'Gamepad', 'game play'],
            ['joystick', '🕹️', 'Joystick', 'game play'],
            ['dice', '🎲', 'Game Die', 'game dice'],
            ['chess-pawn', '♟️', 'Chess Pawn', 'game'],
            ['performing-arts', '🎭', 'Performing Arts', 'theater'],
            ['guitar', '🎸', 'Guitar', 'music'],
            ['drum', '🥁', 'Drum', 'music'],
            ['microphone', '🎤', 'Microphone', 'music sing'],
            ['headphones', '🎧', 'Headphones', 'music audio'],
            ['saxophone', '🎷', 'Saxophone', 'music'],
            ['trumpet', '🎺', 'Trumpet', 'music'],
            ['violin', '🎻', 'Violin', 'music'],
            ['palette', '🎨', 'Palette', 'art paint'],
            ['trophy', '🏆', 'Trophy', 'award winner'],
            ['medal', '🏅', 'Sports Medal', 'award'],
            ['first-place', '🥇', 'First Place Medal', 'gold award'],
            ['clapper', '🎬', 'Movie Clapper', 'film scene'],
            ['ticket', '🎫', 'Ticket', 'event']
        ],
        'travel-places': [
            ['car', '🚗', 'Car', 'vehicle drive'],
            ['taxi', '🚕', 'Taxi', 'vehicle'],
            ['blue-car', '🚙', 'Sport Utility Vehicle', 'vehicle'],
            ['bus', '🚌', 'Bus', 'transport'],
            ['trolleybus', '🚎', 'Trolleybus', 'transport'],
            ['race-car', '🏎️', 'Race Car', 'vehicle fast'],
            ['police-car', '🚓', 'Police Car', 'vehicle'],
            ['ambulance', '🚑', 'Ambulance', 'vehicle medical'],
            ['fire-engine', '🚒', 'Fire Engine', 'vehicle'],
            ['truck', '🚚', 'Delivery Truck', 'vehicle'],
            ['tractor', '🚜', 'Tractor', 'vehicle farm'],
            ['motorcycle', '🏍️', 'Motorcycle', 'vehicle'],
            ['airplane', '✈️', 'Airplane', 'flight travel'],
            ['small-airplane', '🛩️', 'Small Airplane', 'flight travel'],
            ['rocket', '🚀', 'Rocket', 'launch space'],
            ['helicopter', '🚁', 'Helicopter', 'flight'],
            ['bicycle', '🚲', 'Bicycle', 'bike ride'],
            ['scooter', '🛴', 'Kick Scooter', 'ride'],
            ['train', '🚆', 'Train', 'transport'],
            ['metro', '🚇', 'Metro', 'transport'],
            ['tram', '🚊', 'Tram', 'transport'],
            ['ship', '🛳️', 'Ship', 'boat sea'],
            ['sailboat', '⛵', 'Sailboat', 'boat sea'],
            ['speedboat', '🚤', 'Speedboat', 'boat'],
            ['anchor', '⚓', 'Anchor', 'boat sea'],
            ['fuel-pump', '⛽', 'Fuel Pump', 'gas station'],
            ['house', '🏠', 'House', 'home building'],
            ['house-garden', '🏡', 'House With Garden', 'home'],
            ['office', '🏢', 'Office Building', 'building'],
            ['hospital', '🏥', 'Hospital', 'building medical'],
            ['bank', '🏦', 'Bank', 'building money'],
            ['hotel', '🏨', 'Hotel', 'building travel'],
            ['school', '🏫', 'School', 'building education'],
            ['factory', '🏭', 'Factory', 'building industry'],
            ['castle', '🏰', 'Castle', 'building place'],
            ['stadium', '🏟️', 'Stadium', 'place sport'],
            ['statue-of-liberty', '🗽', 'Statue of Liberty', 'place landmark'],
            ['tokyo-tower', '🗼', 'Tokyo Tower', 'place landmark'],
            ['mountain', '⛰️', 'Mountain', 'place nature'],
            ['volcano', '🌋', 'Volcano', 'place nature'],
            ['camping', '🏕️', 'Camping', 'place outdoors'],
            ['beach', '🏖️', 'Beach With Umbrella', 'place travel'],
            ['island', '🏝️', 'Island', 'beach vacation']
        ],
        objects: [
            ['light-bulb', '💡', 'Light Bulb', 'idea'],
            ['phone', '📱', 'Phone', 'mobile device'],
            ['laptop', '💻', 'Laptop', 'computer'],
            ['desktop-computer', '🖥️', 'Desktop Computer', 'computer screen'],
            ['printer', '🖨️', 'Printer', 'office print'],
            ['keyboard', '⌨️', 'Keyboard', 'computer'],
            ['computer-mouse', '🖱️', 'Computer Mouse', 'computer'],
            ['trackball', '🖲️', 'Trackball', 'computer'],
            ['battery', '🔋', 'Battery', 'power'],
            ['electric-plug', '🔌', 'Electric Plug', 'power'],
            ['watch', '⌚', 'Watch', 'time'],
            ['alarm-clock', '⏰', 'Alarm Clock', 'time'],
            ['hourglass', '⌛', 'Hourglass', 'time'],
            ['camera', '📷', 'Camera', 'photo'],
            ['video-camera', '📹', 'Video Camera', 'video'],
            ['movie-camera', '🎥', 'Movie Camera', 'film'],
            ['television', '📺', 'Television', 'screen'],
            ['radio', '📻', 'Radio', 'audio'],
            ['gift', '🎁', 'Gift', 'present'],
            ['pin', '📌', 'Pushpin', 'marker'],
            ['key', '🔑', 'Key', 'lock access'],
            ['lock', '🔒', 'Lock', 'security'],
            ['unlock', '🔓', 'Unlocked', 'security'],
            ['hammer', '🔨', 'Hammer', 'tool build'],
            ['tools', '🛠️', 'Tools', 'build repair'],
            ['wrench', '🔧', 'Wrench', 'tool repair'],
            ['screwdriver', '🪛', 'Screwdriver', 'tool repair'],
            ['nut-and-bolt', '🔩', 'Nut and Bolt', 'tool repair'],
            ['gear', '⚙️', 'Gear', 'settings tool'],
            ['magnet', '🧲', 'Magnet', 'science'],
            ['test-tube', '🧪', 'Test Tube', 'science'],
            ['pill', '💊', 'Pill', 'medicine'],
            ['syringe', '💉', 'Syringe', 'medicine'],
            ['money-bag', '💰', 'Money Bag', 'money'],
            ['coin', '🪙', 'Coin', 'money'],
            ['credit-card', '💳', 'Credit Card', 'money'],
            ['chart-up', '📈', 'Chart Increasing', 'chart business'],
            ['chart-down', '📉', 'Chart Decreasing', 'chart business'],
            ['envelope', '✉️', 'Envelope', 'mail'],
            ['email', '📧', 'Email', 'mail'],
            ['inbox', '📥', 'Inbox', 'mail'],
            ['package', '📦', 'Package', 'box delivery'],
            ['pencil', '✏️', 'Pencil', 'write'],
            ['pen', '🖊️', 'Pen', 'write'],
            ['paintbrush', '🖌️', 'Paintbrush', 'art'],
            ['scissors', '✂️', 'Scissors', 'cut'],
            ['book', '📖', 'Open Book', 'read book'],
            ['notebook', '📓', 'Notebook', 'write book'],
            ['calendar', '📅', 'Calendar', 'date'],
            ['clipboard', '📋', 'Clipboard', 'office'],
            ['paperclip', '📎', 'Paperclip', 'office attach'],
            ['trash', '🗑️', 'Trash Can', 'delete']
        ],
        symbols: [
            ['heart', '❤️', 'Heart', 'love'],
            ['orange-heart', '🧡', 'Orange Heart', 'love'],
            ['yellow-heart', '💛', 'Yellow Heart', 'love'],
            ['green-heart', '💚', 'Green Heart', 'love'],
            ['blue-heart', '💙', 'Blue Heart', 'love'],
            ['purple-heart', '💜', 'Purple Heart', 'love'],
            ['black-heart', '🖤', 'Black Heart', 'love'],
            ['broken-heart', '💔', 'Broken Heart', 'sad love'],
            ['hundred', '💯', 'Hundred Points', 'score perfect'],
            ['star', '⭐', 'Star', 'favorite'],
            ['sparkles', '✨', 'Sparkles', 'magic shine'],
            ['dizzy', '💫', 'Dizzy', 'star spin'],
            ['boom', '💥', 'Collision', 'boom explosion'],
            ['sweat-drops', '💦', 'Sweat Droplets', 'water'],
            ['dash', '💨', 'Dashing Away', 'speed'],
            ['speech', '💬', 'Speech Balloon', 'chat comment'],
            ['thought', '💭', 'Thought Balloon', 'think'],
            ['zzz', '💤', 'ZZZ', 'sleep'],
            ['check', '✅', 'Check Mark', 'yes success'],
            ['cross', '❌', 'Cross Mark', 'no error'],
            ['warning', '⚠️', 'Warning', 'alert caution'],
            ['question', '❓', 'Question Mark', 'help'],
            ['exclamation', '❗', 'Exclamation Mark', 'alert'],
            ['plus', '➕', 'Plus', 'add'],
            ['minus', '➖', 'Minus', 'subtract'],
            ['divide', '➗', 'Divide', 'math'],
            ['multiply', '✖️', 'Multiply', 'math'],
            ['infinity', '♾️', 'Infinity', 'forever'],
            ['recycle', '♻️', 'Recycle', 'environment'],
            ['peace', '☮️', 'Peace Symbol', 'peace'],
            ['yin-yang', '☯️', 'Yin Yang', 'balance'],
            ['wheel-dharma', '☸️', 'Wheel of Dharma', 'symbol'],
            ['atom', '⚛️', 'Atom Symbol', 'science'],
            ['aries', '♈', 'Aries', 'zodiac'],
            ['taurus', '♉', 'Taurus', 'zodiac'],
            ['gemini', '♊', 'Gemini', 'zodiac'],
            ['cancer', '♋', 'Cancer', 'zodiac'],
            ['leo', '♌', 'Leo', 'zodiac'],
            ['virgo', '♍', 'Virgo', 'zodiac'],
            ['libra', '♎', 'Libra', 'zodiac'],
            ['scorpio', '♏', 'Scorpio', 'zodiac'],
            ['sagittarius', '♐', 'Sagittarius', 'zodiac'],
            ['capricorn', '♑', 'Capricorn', 'zodiac'],
            ['aquarius', '♒', 'Aquarius', 'zodiac'],
            ['pisces', '♓', 'Pisces', 'zodiac'],
            ['play-button', '▶️', 'Play Button', 'media'],
            ['pause-button', '⏸️', 'Pause Button', 'media'],
            ['stop-button', '⏹️', 'Stop Button', 'media'],
            ['record-button', '⏺️', 'Record Button', 'media'],
            ['fast-forward', '⏩', 'Fast Forward', 'media'],
            ['rewind', '⏪', 'Rewind', 'media'],
            ['up-arrow', '⬆️', 'Up Arrow', 'arrow'],
            ['down-arrow', '⬇️', 'Down Arrow', 'arrow'],
            ['left-arrow', '⬅️', 'Left Arrow', 'arrow'],
            ['right-arrow', '➡️', 'Right Arrow', 'arrow']
        ],
        flags: [
            ['flag-us', '🇺🇸', 'United States Flag', 'usa america'],
            ['flag-gb', '🇬🇧', 'United Kingdom Flag', 'uk britain'],
            ['flag-ca', '🇨🇦', 'Canada Flag', 'canadian'],
            ['flag-ng', '🇳🇬', 'Nigeria Flag', 'nigerian'],
            ['flag-za', '🇿🇦', 'South Africa Flag', 'south african'],
            ['flag-fr', '🇫🇷', 'France Flag', 'french'],
            ['flag-de', '🇩🇪', 'Germany Flag', 'german'],
            ['flag-jp', '🇯🇵', 'Japan Flag', 'japanese'],
            ['flag-br', '🇧🇷', 'Brazil Flag', 'brazilian'],
            ['flag-mx', '🇲🇽', 'Mexico Flag', 'mexican'],
            ['flag-es', '🇪🇸', 'Spain Flag', 'spanish'],
            ['flag-it', '🇮🇹', 'Italy Flag', 'italian'],
            ['flag-cn', '🇨🇳', 'China Flag', 'chinese'],
            ['flag-in', '🇮🇳', 'India Flag', 'indian'],
            ['flag-gh', '🇬🇭', 'Ghana Flag', 'ghanaian'],
            ['flag-ke', '🇰🇪', 'Kenya Flag', 'kenyan'],
            ['flag-eg', '🇪🇬', 'Egypt Flag', 'egyptian'],
            ['flag-ae', '🇦🇪', 'United Arab Emirates Flag', 'uae emirates'],
            ['flag-sa', '🇸🇦', 'Saudi Arabia Flag', 'saudi'],
            ['flag-tr', '🇹🇷', 'Turkey Flag', 'turkish'],
            ['flag-kr', '🇰🇷', 'South Korea Flag', 'korean'],
            ['flag-au', '🇦🇺', 'Australia Flag', 'australian'],
            ['flag-nz', '🇳🇿', 'New Zealand Flag', 'new zealand'],
            ['flag-jm', '🇯🇲', 'Jamaica Flag', 'jamaican'],
            ['flag-eu', '🇪🇺', 'European Union Flag', 'europe']
        ]
    };

    const items = Object.entries(rawItems).flatMap(([category, entries]) => entries.map(entry => ({
        id: entry[0],
        glyph: entry[1],
        name: entry[2],
        category,
        keywords: entry[3]
    })));

    function escapeText(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function renderSvg(item) {
        const glyph = escapeText(item.glyph);
        const label = escapeText(item.name);
        return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="${label}">
<rect width="512" height="512" fill="transparent"/>
<text x="256" y="286" text-anchor="middle" dominant-baseline="middle" font-size="360" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, EmojiOne Color, sans-serif">${glyph}</text>
</svg>`;
    }

    function installEmojiLibraryPanel() {
        const toggle = document.querySelector('.emoji-lib-toggle');
        const panel = document.querySelector('.emoji-lib-panel');
        const cats = document.getElementById('emoji-lib-categories');
        const grid = document.getElementById('emoji-lib-grid');
        const search = document.getElementById('emoji-lib-search');
        if (!toggle || !panel || !cats || !grid) {
            global.__emojiLibraryInstallAttempts = (global.__emojiLibraryInstallAttempts || 0) + 1;
            if (global.__emojiLibraryInstallAttempts < 30) {
                setTimeout(installEmojiLibraryPanel, 250);
            }
            return;
        }

        // Older builds let the generic section-collapser wrap this custom
        // panel, which left two chevrons and caused open/close flicker.
        toggle.classList.remove('section-toggle');
        toggle.querySelectorAll('.section-arrow').forEach(arrow => arrow.remove());
        const wrappedBody = panel.parentElement;
        if (wrappedBody?.classList?.contains('section-body')) {
            const group = wrappedBody.parentElement;
            if (group) {
                group.insertBefore(panel, wrappedBody);
                if (!wrappedBody.children.length) wrappedBody.remove();
            }
        }

        const state = global.__emojiLibraryPanelState || {
            category: 'all',
            query: ''
        };
        global.__emojiLibraryPanelState = state;

        const render = () => {
            const query = (state.query || '').toLowerCase().trim();
            const category = state.category || 'all';
            const filtered = items.filter(item => {
                const inCategory = category === 'all' || item.category === category;
                const haystack = `${item.name} ${item.glyph} ${item.keywords || ''} ${item.category}`.toLowerCase();
                return inCategory && (!query || haystack.includes(query));
            });

            grid.innerHTML = '';
            grid.dataset.emojiCount = String(filtered.length);
            filtered.forEach(item => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'emoji-btn';
                btn.title = item.name;
                btn.dataset.emojiId = item.id;
                btn.innerHTML = `<span aria-hidden="true">${item.glyph}</span>`;
                grid.appendChild(btn);
            });
            if (!filtered.length) {
                grid.innerHTML = '<div class="emoji-lib-empty">No emoji assets found.</div>';
            }
        };

        if (grid.dataset.emojiFallbackBound !== '1') {
            grid.dataset.emojiFallbackBound = '1';
            grid.addEventListener('click', event => {
                const btn = event.target.closest ? event.target.closest('.emoji-btn') : null;
                if (!btn) return;
                const item = items.find(candidate => candidate.id === btn.dataset.emojiId);
                const manager = global.app && global.app.objects ? global.app.objects : null;
                if (item && manager && typeof manager._insertEmoji === 'function') {
                    manager._insertEmoji(item);
                }
            });
        }

        cats.innerHTML = '';
        [{ id: 'all', label: 'All' }, ...categories].forEach(cat => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'emoji-cat-btn';
            btn.textContent = cat.label;
            btn.dataset.category = cat.id;
            btn.onclick = event => {
                event.stopPropagation();
                state.category = cat.id;
                cats.querySelectorAll('.emoji-cat-btn').forEach(el => {
                    el.classList.toggle('active', el.dataset.category === state.category);
                });
                render();
            };
            cats.appendChild(btn);
        });

        cats.querySelectorAll('.emoji-cat-btn').forEach(el => {
            el.classList.toggle('active', el.dataset.category === state.category);
        });

        toggle.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            const isOpen = panel.classList.contains('open') || getComputedStyle(panel).display !== 'none';
            panel.classList.toggle('open', !isOpen);
            panel.style.display = isOpen ? 'none' : 'block';
            toggle.classList.toggle('open', !isOpen);
            if (!isOpen) render();
        };

        if (search) {
            search.value = state.query || '';
            search.oninput = () => {
                state.query = search.value || '';
                render();
            };
        }

        render();
    }

    global.EmojiLibraryData = { categories, items, renderSvg, installPanel: installEmojiLibraryPanel };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installEmojiLibraryPanel);
    } else {
        installEmojiLibraryPanel();
    }
    setTimeout(installEmojiLibraryPanel, 500);
    setTimeout(installEmojiLibraryPanel, 1500);
})(window);
