// Словарь частых слов, общий для всех рассказов.
// Значение — строка с переводом или [начальная форма, перевод начальной формы, пояснение формы].
const COMMON_DICT = {
  a: "артикль «один, какой-то» (не переводится)",
  an: "артикль «один, какой-то» перед гласным звуком",
  the: "артикль «этот, тот самый» (не переводится)",
  and: "и",
  but: "но",
  i: "я",
  you: "ты, вы",
  he: "он",
  she: "она",
  it: "оно, это (о предмете или погоде)",
  we: "мы",
  they: "они",
  my: "мой, моя, мои",
  his: "его",
  her: "её",
  is: ["be", "быть, являться", "форма для he / she / it"],
  am: ["be", "быть, являться", "форма для I"],
  are: ["be", "быть, являться", "форма для we / you / they"],
  was: ["be", "быть", "прошедшее время для I / he / she / it"],
  were: ["be", "быть", "прошедшее время для we / you / they"],
  in: "в",
  on: "на",
  at: "в, на (место или время)",
  to: "к, в (направление); частица перед глаголом",
  with: "с",
  by: "у, около; на (транспорте)",
  of: "из; передаёт родительный падеж",
  near: "рядом, возле",
  under: "под",
  this: "это, этот",
  very: "очень",
  all: "весь, все",
  every: "каждый",
  day: "день",
  home: "дом (родной); домой, дома",
  morning: "утро",
  evening: "вечер",
  one: "один, одна",
  some: "немного, несколько",
  then: "потом, затем",
  also: "также, тоже",
  when: "когда",
  says: ["say", "говорить, сказать", "форма для he / she / it"],
  mom: "мама",
  dad: "папа",
  friend: "друг",
  friends: ["friend", "друг", "множественное число: друзья"],
  brother: "брат",
  sister: "сестра",
  little: "маленький, младший",
  big: "большой",
  small: "маленький",
  please: "пожалуйста",
  thank: "благодарить («thank you» — спасибо)",
  there: "там («there is» — есть, имеется)",
  "don't": ["do not", "не (отрицание)", "сокращение от do not"],
  "doesn't": ["does not", "не (отрицание)", "сокращение от does not, для he / she / it"],
  milk: "молоко",
  fish: "рыба",
  apple: "яблоко",
  buy: "покупать",
  goes: ["go", "идти, ехать", "форма для he / she / it"],
  drinks: ["drink", "пить", "форма для he / she / it"],
  eats: ["eat", "есть, кушать", "форма для he / she / it"],
  tom: "Том (имя)",
  dog: "собака",
};

// Рассказы от самого лёгкого к сложному.
// text: [английское предложение, перевод]
const STORIES = [
  {
    title: "My Cat",
    ru: "Мой кот",
    level: "A1 · очень легко",
    rule: {
      title: "Глагол to be и слова my / his / her",
      html: `
        <p>В русском мы говорим «Том большой», а в английском обязательно нужен глагол <b>to be</b>: <i>Tom <b>is</b> big.</i></p>
        <table>
          <tr><td>I</td><td><b>am</b></td><td>I am hungry.</td></tr>
          <tr><td>he / she / it</td><td><b>is</b></td><td>He is lazy.</td></tr>
          <tr><td>we / you / they</td><td><b>are</b></td><td>We are friends.</td></tr>
        </table>
        <p><b>my</b> — мой, <b>his</b> — его, <b>her</b> — её. Они стоят перед словом: <i>my cat, his name</i>.</p>
        <p>💡 <b>Правило чтения:</b> <b>th</b> читается как межзубный звук (кончик языка между зубами): <i>this, the</i>.</p>`,
    },
    text: [
      ["This is my cat.", "Это мой кот."],
      ["His name is Tom.", "Его зовут Том."],
      ["Tom is big and black.", "Том большой и чёрный."],
      ["He is very lazy.", "Он очень ленивый."],
      ["He sleeps on my bed all day.", "Он спит на моей кровати весь день."],
      ["In the evening he is hungry.", "Вечером он голодный."],
      ["He eats fish and drinks milk.", "Он ест рыбу и пьёт молоко."],
      ["I love my cat.", "Я люблю своего кота."],
    ],
    dict: {
      cat: "кот, кошка",
      name: "имя",
      black: "чёрный",
      lazy: "ленивый",
      sleeps: ["sleep", "спать", "форма для he / she / it"],
      bed: "кровать",
      hungry: "голодный",
      love: "любить",
    },
    exercises: [
      ["Tom ___ big and black.", ["am", "is", "are"], 1],
      ["I ___ hungry.", ["am", "is", "are"], 0],
      ["This is ___ cat. (мой)", ["my", "his", "her"], 0],
      ["___ name is Tom. (его)", ["My", "His", "Her"], 1],
    ],
  },
  {
    title: "Anna's Day",
    ru: "День Анны",
    level: "A1 · легко",
    rule: {
      title: "Present Simple: окончание -s у he / she / it",
      html: `
        <p>Present Simple — время для привычек и того, что происходит регулярно: <i>every morning, every day</i>.</p>
        <p>Если действует <b>he / she / it</b> (Анна = she), к глаголу добавляем <b>-s</b>:</p>
        <p><i>I live → she live<b>s</b>, I like → she like<b>s</b>, I go → she go<b>es</b></i></p>
        <p>Отрицание: <b>doesn't + глагол без -s</b>: <i>She doesn't like math.</i></p>
        <p>💡 <b>Правило чтения:</b> окончание <b>-s</b> читается как [з] после гласных и звонких (<i>goes, reads</i>) и как [с] после глухих (<i>likes, gets</i>).</p>`,
    },
    text: [
      ["Anna is a student.", "Анна — студентка."],
      ["She lives in a small town.", "Она живёт в маленьком городке."],
      ["Every morning she gets up at seven.", "Каждое утро она встаёт в семь."],
      ["She drinks coffee and eats an egg.", "Она пьёт кофе и ест яйцо."],
      ["Then she goes to school by bus.", "Потом она едет в школу на автобусе."],
      ["Anna likes English and music.", "Анне нравятся английский и музыка."],
      ["She doesn't like math.", "Ей не нравится математика."],
      ["In the evening she reads books.", "Вечером она читает книги."],
    ],
    dict: {
      "anna's": "Анны (притяжательное 's: «чей?»)",
      anna: "Анна (имя)",
      student: "студент, студентка",
      lives: ["live", "жить", "форма для he / she / it"],
      town: "город, городок",
      gets: ["get", "получать; «get up» — вставать", "форма для he / she / it"],
      up: "вверх («get up» — вставать)",
      seven: "семь",
      coffee: "кофе",
      egg: "яйцо",
      school: "школа",
      bus: "автобус",
      likes: ["like", "нравиться, любить", "форма для he / she / it"],
      like: "нравиться, любить",
      english: "английский язык",
      music: "музыка",
      math: "математика",
      reads: ["read", "читать", "форма для he / she / it"],
      books: ["book", "книга", "множественное число: книги"],
    },
    exercises: [
      ["She ___ in a small town.", ["live", "lives", "living"], 1],
      ["I ___ coffee every morning.", ["drink", "drinks", "drinking"], 0],
      ["She doesn't ___ math.", ["like", "likes", "liking"], 0],
      ["Anna ___ to school by bus.", ["go", "goes", "going"], 1],
    ],
  },
  {
    title: "At the Shop",
    ru: "В магазине",
    level: "A1 · легко",
    rule: {
      title: "Артикли a / an / the и слово some",
      html: `
        <p><b>a</b> — «какой-то, один», перед согласным звуком: <i>a bottle</i>.</p>
        <p><b>an</b> — то же, но перед гласным звуком: <i>an apple</i>.</p>
        <p><b>the</b> — «тот самый», когда уже понятно, о чём речь: <i>He takes an apple. <b>The</b> apple is red.</i></p>
        <p><b>some</b> — «немного, несколько»; его ставят перед тем, что нельзя посчитать: <i>some bread, some food</i>.</p>
        <p>💡 <b>Правило чтения:</b> <b>ea</b> обычно читается как долгое [и:]: <i>eat, cheese</i> (тут <b>ee</b>), <i>please</i>.</p>`,
    },
    text: [
      ["Tom goes to the shop.", "Том идёт в магазин."],
      ["He wants to buy some food.", "Он хочет купить еды."],
      ["He takes a bottle of milk and an apple.", "Он берёт бутылку молока и яблоко."],
      ["The apple is red and sweet.", "Яблоко красное и сладкое."],
      ["He also takes some bread and cheese.", "Ещё он берёт хлеб и сыр."],
      ["“How much is it?” Tom asks.", "«Сколько это стоит?» — спрашивает Том."],
      ["“Five dollars, please,” says the woman.", "«Пять долларов, пожалуйста», — говорит женщина."],
      ["Tom pays and says, “Thank you!”", "Том платит и говорит: «Спасибо!»"],
    ],
    dict: {
      shop: "магазин",
      wants: ["want", "хотеть", "форма для he / she / it"],
      food: "еда",
      takes: ["take", "брать", "форма для he / she / it"],
      bottle: "бутылка",
      red: "красный",
      sweet: "сладкий",
      bread: "хлеб",
      cheese: "сыр",
      how: "как («how much» — сколько)",
      much: "много («how much» — сколько)",
      asks: ["ask", "спрашивать", "форма для he / she / it"],
      five: "пять",
      dollars: ["dollar", "доллар", "множественное число"],
      woman: "женщина",
      pays: ["pay", "платить", "форма для he / she / it"],
    },
    exercises: [
      ["He takes ___ apple.", ["a", "an", "the"], 1],
      ["He takes ___ bottle of milk.", ["a", "an", "the"], 0],
      ["He buys an apple. ___ apple is red.", ["A", "An", "The"], 2],
      ["He wants to buy ___ bread.", ["a", "an", "some"], 2],
    ],
  },
  {
    title: "A Rainy Sunday",
    ru: "Дождливое воскресенье",
    level: "A1+ · немного сложнее",
    rule: {
      title: "Present Continuous: что происходит прямо сейчас",
      html: `
        <p>Когда действие идёт <b>прямо сейчас</b>, используем формулу:</p>
        <p><b>am / is / are + глагол с окончанием -ing</b></p>
        <p><i>Mom <b>is cooking</b>. — Мама (сейчас) готовит.<br>I <b>am sitting</b>. — Я (сейчас) сижу.</i></p>
        <p>Если глагол оканчивается на <b>-e</b>, она пропадает: <i>write → writing</i>. Короткие глаголы удваивают согласную: <i>sit → si<b>tt</b>ing</i>.</p>
        <p>💡 <b>Правило чтения:</b> <b>-ing</b> читается как [ин] с носовым «н», не произносите отдельное «г».</p>`,
    },
    text: [
      ["It is Sunday.", "Сегодня воскресенье."],
      ["It is raining outside.", "На улице идёт дождь."],
      ["Mom is cooking soup in the kitchen.", "Мама варит суп на кухне."],
      ["Dad is reading a newspaper.", "Папа читает газету."],
      ["My little brother is playing with his dog.", "Мой младший брат играет со своей собакой."],
      ["And I am sitting by the window.", "А я сижу у окна."],
      ["I am writing a letter to my friend.", "Я пишу письмо своему другу."],
      ["We are all at home, and we are happy.", "Мы все дома, и мы счастливы."],
    ],
    dict: {
      rainy: "дождливый",
      sunday: "воскресенье",
      raining: ["rain", "идти (о дожде)", "форма -ing: происходит сейчас"],
      outside: "снаружи, на улице",
      cooking: ["cook", "готовить (еду)", "форма -ing: происходит сейчас"],
      soup: "суп",
      kitchen: "кухня",
      reading: ["read", "читать", "форма -ing: происходит сейчас"],
      newspaper: "газета",
      playing: ["play", "играть", "форма -ing: происходит сейчас"],
      sitting: ["sit", "сидеть", "форма -ing: происходит сейчас"],
      window: "окно",
      writing: ["write", "писать", "форма -ing: происходит сейчас"],
      letter: "письмо; буква",
      happy: "счастливый",
    },
    exercises: [
      ["Mom is ___ soup.", ["cook", "cooks", "cooking"], 2],
      ["I ___ sitting by the window.", ["am", "is", "are"], 0],
      ["We ___ all at home.", ["am", "is", "are"], 2],
      ["Dad is ___ a newspaper.", ["read", "reading", "reads"], 1],
    ],
  },
  {
    title: "The Trip to the Sea",
    ru: "Поездка на море",
    level: "A2 · средне",
    rule: {
      title: "Past Simple: прошедшее время",
      html: `
        <p>Past Simple рассказывает о том, что уже случилось: <i>last summer, one day</i>.</p>
        <p><b>Правильные глаголы</b> получают <b>-ed</b>: <i>stay → stay<b>ed</b>, play → play<b>ed</b>, travel → travel<b>ed</b></i>.</p>
        <p><b>Неправильные глаголы</b> нужно запомнить:</p>
        <table>
          <tr><td>go</td><td>→ <b>went</b></td><td>идти</td></tr>
          <tr><td>see</td><td>→ <b>saw</b></td><td>видеть</td></tr>
          <tr><td>swim</td><td>→ <b>swam</b></td><td>плавать</td></tr>
          <tr><td>find</td><td>→ <b>found</b></td><td>находить</td></tr>
          <tr><td>come</td><td>→ <b>came</b></td><td>приходить</td></tr>
        </table>
        <p>У to be в прошедшем две формы: <b>was</b> (I, he, she, it) и <b>were</b> (we, you, they).</p>
        <p>💡 <b>Правило чтения:</b> <b>-ed</b> читается как [д] (<i>played</i>), [т] после глухих (<i>looked</i>) и [ид] после t/d (<i>wanted</i>).</p>`,
    },
    text: [
      ["Last summer we went to the sea.", "Прошлым летом мы ездили на море."],
      ["We traveled by train.", "Мы ехали на поезде."],
      ["The trip was long, but interesting.", "Поездка была долгой, но интересной."],
      ["We stayed in a small hotel near the beach.", "Мы жили в маленькой гостинице возле пляжа."],
      ["Every day we swam and played on the sand.", "Каждый день мы плавали и играли на песке."],
      ["One day I saw a big fish.", "Однажды я увидел большую рыбу."],
      ["My sister found a beautiful shell.", "Моя сестра нашла красивую ракушку."],
      ["We were very sad when we came back home.", "Нам было очень грустно, когда мы вернулись домой."],
    ],
    dict: {
      trip: "поездка",
      sea: "море",
      last: "прошлый, последний",
      summer: "лето",
      went: ["go", "идти, ехать", "прошедшее время (неправильный глагол)"],
      traveled: ["travel", "путешествовать, ехать", "прошедшее время (-ed)"],
      train: "поезд",
      long: "долгий, длинный",
      interesting: "интересный",
      stayed: ["stay", "оставаться, жить (в гостинице)", "прошедшее время (-ed)"],
      hotel: "гостиница",
      beach: "пляж",
      swam: ["swim", "плавать", "прошедшее время (неправильный глагол)"],
      played: ["play", "играть", "прошедшее время (-ed)"],
      sand: "песок",
      saw: ["see", "видеть", "прошедшее время (неправильный глагол)"],
      found: ["find", "находить", "прошедшее время (неправильный глагол)"],
      beautiful: "красивый",
      shell: "ракушка",
      sad: "грустный",
      came: ["come", "приходить, приезжать", "прошедшее время (неправильный глагол)"],
      back: "назад («come back» — вернуться)",
    },
    exercises: [
      ["Last summer we ___ to the sea.", ["go", "went", "goes"], 1],
      ["We ___ in a small hotel.", ["stay", "stayed", "staying"], 1],
      ["The trip ___ long.", ["was", "were", "is"], 0],
      ["One day I ___ a big fish.", ["see", "saw", "seed"], 1],
    ],
  },
  {
    title: "The Lost Key",
    ru: "Потерянный ключ",
    level: "A2 · средне",
    rule: {
      title: "Будущее время: will и be going to",
      html: `
        <p><b>will + глагол</b> — решение прямо сейчас или обещание:</p>
        <p><i>“I <b>will help</b> you.” — Я помогу тебе.</i></p>
        <p><b>am / is / are going to + глагол</b> — план, решили заранее:</p>
        <p><i>They <b>are going to have</b> a party. — Они собираются устроить вечеринку.</i></p>
        <p>Отрицание с will: <b>will not = won't</b>, или как в тексте: <i>I will <b>never</b> lose it.</i></p>
        <p>💡 <b>Правило чтения:</b> буква <b>y</b> в конце слова читается как [и]: <i>party, finally</i>; в коротких словах — как [ай]: <i>my, by</i>.</p>`,
    },
    text: [
      ["Tomorrow is Max's birthday.", "Завтра у Макса день рождения."],
      ["His friends are going to have a party.", "Его друзья собираются устроить вечеринку."],
      ["But there is a problem: Max lost the key to his house.", "Но есть проблема: Макс потерял ключ от своего дома."],
      ["“Don't worry,” says Kate. “I will help you.”", "«Не волнуйся, — говорит Кейт. — Я тебе помогу»."],
      ["They look under the table, in the bag and in the car.", "Они ищут под столом, в сумке и в машине."],
      ["Finally Kate finds the key in his jacket!", "Наконец Кейт находит ключ в его куртке!"],
      ["“Thank you! I will never lose it again,” Max says.", "«Спасибо! Я больше никогда его не потеряю», — говорит Макс."],
      ["“I am going to buy a key holder,” he laughs.", "«Я собираюсь купить ключницу», — смеётся он."],
    ],
    dict: {
      lost: ["lose", "терять", "прошедшее время (неправильный глагол); также «потерянный»"],
      key: "ключ",
      tomorrow: "завтра",
      "max's": "Макса (притяжательное 's: «чей?»)",
      max: "Макс (имя)",
      birthday: "день рождения",
      going: ["go", "идти", "«be going to» — собираться что-то сделать"],
      have: "иметь («have a party» — устроить вечеринку)",
      party: "вечеринка, праздник",
      problem: "проблема",
      house: "дом",
      worry: "волноваться, беспокоиться",
      kate: "Кейт (имя)",
      will: "вспомогательное слово будущего времени («I will help» — я помогу)",
      help: "помогать",
      look: "смотреть, искать",
      table: "стол",
      bag: "сумка",
      car: "машина",
      finally: "наконец",
      finds: ["find", "находить", "форма для he / she / it"],
      jacket: "куртка",
      never: "никогда",
      lose: "терять",
      again: "снова",
      holder: "держатель («key holder» — ключница)",
      laughs: ["laugh", "смеяться", "форма для he / she / it"],
    },
    exercises: [
      ["Don't worry, I ___ help you.", ["will", "am", "going"], 0],
      ["They are going ___ have a party.", ["to", "will", "for"], 0],
      ["I ___ going to buy a key holder.", ["am", "is", "are"], 0],
      ["Max ___ never lose it again.", ["is", "will", "are"], 1],
    ],
  },
];
