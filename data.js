// Словарь по темам: [английское слово, перевод, пример]
const TOPICS = {
  basics: {
    title: "Основы",
    icon: "👋",
    words: [
      ["hello", "привет", "Hello! How are you?"],
      ["goodbye", "до свидания", "Goodbye, see you tomorrow."],
      ["please", "пожалуйста (просьба)", "Can you help me, please?"],
      ["thank you", "спасибо", "Thank you for your help."],
      ["yes", "да", "Yes, I agree."],
      ["no", "нет", "No, thanks."],
      ["sorry", "извините", "Sorry, I am late."],
      ["friend", "друг", "He is my best friend."],
      ["name", "имя", "What is your name?"],
      ["morning", "утро", "Good morning!"],
    ],
  },
  family: {
    title: "Семья",
    icon: "👨‍👩‍👧",
    words: [
      ["mother", "мама", "My mother is a doctor."],
      ["father", "папа", "My father likes football."],
      ["sister", "сестра", "I have one sister."],
      ["brother", "брат", "My brother is older than me."],
      ["grandmother", "бабушка", "My grandmother bakes cakes."],
      ["grandfather", "дедушка", "My grandfather lives in a village."],
      ["son", "сын", "Their son is five years old."],
      ["daughter", "дочь", "She has a daughter."],
      ["husband", "муж", "Her husband is very kind."],
      ["wife", "жена", "His wife works in a bank."],
    ],
  },
  food: {
    title: "Еда",
    icon: "🍎",
    words: [
      ["apple", "яблоко", "I eat an apple every day."],
      ["bread", "хлеб", "We need some bread."],
      ["water", "вода", "Can I have a glass of water?"],
      ["milk", "молоко", "The cat drinks milk."],
      ["cheese", "сыр", "I like cheese sandwiches."],
      ["egg", "яйцо", "She had an egg for breakfast."],
      ["meat", "мясо", "He doesn't eat meat."],
      ["fish", "рыба", "We cooked fish for dinner."],
      ["soup", "суп", "This soup is hot."],
      ["sugar", "сахар", "No sugar in my tea, please."],
    ],
  },
  animals: {
    title: "Животные",
    icon: "🐶",
    words: [
      ["dog", "собака", "The dog is barking."],
      ["cat", "кошка", "My cat sleeps all day."],
      ["horse", "лошадь", "The horse runs fast."],
      ["cow", "корова", "The cow gives milk."],
      ["bird", "птица", "A bird is singing."],
      ["mouse", "мышь", "The mouse is very small."],
      ["bear", "медведь", "Bears live in the forest."],
      ["wolf", "волк", "The wolf is hungry."],
      ["rabbit", "кролик", "The rabbit eats carrots."],
      ["fox", "лиса", "The fox is clever."],
    ],
  },
  home: {
    title: "Дом",
    icon: "🏠",
    words: [
      ["house", "дом", "They live in a big house."],
      ["room", "комната", "My room is small."],
      ["kitchen", "кухня", "Mom is in the kitchen."],
      ["door", "дверь", "Close the door, please."],
      ["window", "окно", "Open the window."],
      ["table", "стол", "The book is on the table."],
      ["chair", "стул", "Sit on the chair."],
      ["bed", "кровать", "I go to bed at ten."],
      ["key", "ключ", "I lost my key."],
      ["floor", "пол", "The floor is clean."],
    ],
  },
  verbs: {
    title: "Глаголы",
    icon: "🏃",
    words: [
      ["to go", "идти", "I go to school."],
      ["to eat", "есть (кушать)", "We eat at seven."],
      ["to drink", "пить", "Drink more water."],
      ["to read", "читать", "I like to read books."],
      ["to write", "писать", "Write your name here."],
      ["to speak", "говорить", "Do you speak English?"],
      ["to listen", "слушать", "Listen to the music."],
      ["to sleep", "спать", "Babies sleep a lot."],
      ["to work", "работать", "She works every day."],
      ["to learn", "учить", "I learn English."],
    ],
  },
  colors: {
    title: "Цвета и числа",
    icon: "🎨",
    words: [
      ["red", "красный", "The apple is red."],
      ["blue", "синий", "The sky is blue."],
      ["green", "зелёный", "The grass is green."],
      ["yellow", "жёлтый", "The sun is yellow."],
      ["black", "чёрный", "I have a black cat."],
      ["white", "белый", "Snow is white."],
      ["one", "один", "I have one brother."],
      ["two", "два", "Two cups of tea, please."],
      ["three", "три", "She has three dogs."],
      ["ten", "десять", "I wake up at ten."],
    ],
  },
  travel: {
    title: "Путешествия",
    icon: "✈️",
    words: [
      ["airport", "аэропорт", "We are at the airport."],
      ["ticket", "билет", "I bought a ticket."],
      ["train", "поезд", "The train is late."],
      ["hotel", "гостиница", "Our hotel is near the sea."],
      ["passport", "паспорт", "Show me your passport."],
      ["map", "карта", "Let's look at the map."],
      ["street", "улица", "Go down the street."],
      ["left", "налево", "Turn left here."],
      ["right", "направо", "The bank is on the right."],
      ["luggage", "багаж", "Where is my luggage?"],
    ],
  },
};

// Мини-уроки грамматики с упражнениями
const GRAMMAR = [
  {
    title: "Глагол to be (am / is / are)",
    theory: `
      <p>Глагол <b>to be</b> значит «быть, являться». В русском его часто опускают, а в английском — никогда.</p>
      <table>
        <tr><td>I</td><td><b>am</b></td><td>I am a student. — Я студент.</td></tr>
        <tr><td>He / She / It</td><td><b>is</b></td><td>She is happy. — Она счастлива.</td></tr>
        <tr><td>We / You / They</td><td><b>are</b></td><td>They are friends. — Они друзья.</td></tr>
      </table>`,
    exercises: [
      ["I ___ hungry.", ["am", "is", "are"], 0],
      ["My dog ___ big.", ["am", "is", "are"], 1],
      ["We ___ at home.", ["am", "is", "are"], 2],
      ["You ___ my friend.", ["am", "is", "are"], 2],
      ["It ___ cold today.", ["am", "is", "are"], 1],
    ],
  },
  {
    title: "Артикли a / an / the",
    theory: `
      <p><b>a</b> — перед согласным звуком: <i>a cat, a book</i>.</p>
      <p><b>an</b> — перед гласным звуком: <i>an apple, an hour</i>.</p>
      <p><b>the</b> — когда говорим о чём-то конкретном, известном: <i>the sun, the book on the table</i>.</p>`,
    exercises: [
      ["I have ___ apple.", ["a", "an", "the"], 1],
      ["She is ___ teacher.", ["a", "an", "the"], 0],
      ["___ sun is hot.", ["A", "An", "The"], 2],
      ["He ate ___ egg.", ["a", "an", "the"], 1],
      ["This is ___ dog.", ["a", "an", "the"], 0],
    ],
  },
  {
    title: "Present Simple",
    theory: `
      <p>Время для привычек и фактов: <i>I work every day.</i></p>
      <p>Для <b>he / she / it</b> к глаголу добавляем <b>-s</b>: <i>She work<b>s</b>.</i></p>
      <p>Вопрос и отрицание — через <b>do / does</b>: <i>Do you like tea? She does not (doesn't) like coffee.</i></p>`,
    exercises: [
      ["She ___ in London.", ["live", "lives", "living"], 1],
      ["I ___ coffee every morning.", ["drink", "drinks", "drinking"], 0],
      ["___ you speak English?", ["Do", "Does", "Is"], 0],
      ["He ___ like fish.", ["don't", "doesn't", "isn't"], 1],
      ["They ___ football on Sundays.", ["play", "plays", "playing"], 0],
    ],
  },
  {
    title: "Present Continuous",
    theory: `
      <p>Действие, которое происходит <b>прямо сейчас</b>.</p>
      <p>Формула: <b>am / is / are + глагол-ing</b></p>
      <p><i>I am reading. She is sleeping. They are playing.</i></p>`,
    exercises: [
      ["I am ___ a book now.", ["read", "reads", "reading"], 2],
      ["She ___ cooking dinner.", ["am", "is", "are"], 1],
      ["They are ___ TV.", ["watch", "watching", "watches"], 1],
      ["Look! It ___ raining.", ["is", "are", "am"], 0],
      ["We ___ waiting for the bus.", ["is", "am", "are"], 2],
    ],
  },
];
