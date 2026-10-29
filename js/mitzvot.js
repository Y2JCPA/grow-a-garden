/* ============================================
   GROW A GARDEN 3D — Mitzvot of the Garden
   The Torah's farming mitzvot, brought into the game in a kid-sized way:
   Peah, Leket, Shichecha, Kilayim, Orlah, Neta Revai, Bikkurim,
   Terumah & Ma'aser, Shemitah and Bal Tashchit.
   Texts come from the Sefaria API (see SOURCES below). The game
   simplifies the halachot — it's a way to learn, not a halachic guide.
   ============================================ */

// ─── The Seven Species (Devarim 8:8) ───
const SEVEN_SPECIES = {
  wheat:       { name: 'Wheat',       he: 'חִטָּה',  emoji: '🌾' },
  barley:      { name: 'Barley',      he: 'שְׂעֹרָה', emoji: '🌾' },
  grapes:      { name: 'Grapes',      he: 'גֶּפֶן',   emoji: '🍇' },
  figs:        { name: 'Figs',        he: 'תְּאֵנָה', emoji: '🟣' },
  pomegranates:{ name: 'Pomegranates',he: 'רִמּוֹן',  emoji: '🔴' },
  olives:      { name: 'Olives',      he: 'זַיִת',    emoji: '🫒' },
  dates:       { name: 'Dates',       he: 'תָּמָר',   emoji: '🌴' },
};
// Which seeds count as which of the seven species
const SPECIES_OF_SEED = { wheat: 'wheat', barley: 'barley', gefen: 'grapes', grape: 'grapes', wine: 'grapes', fig: 'figs', pomegranate: 'pomegranates', olive: 'olives', date_palm: 'dates' };
// Fruit trees (and vines) that keep giving fruit — these have Orlah
const FRUIT_TREES = ['apple', 'mango', 'cacao', 'coconut', 'fig', 'pomegranate', 'olive', 'date_palm', 'gefen', 'grape'];
const VINES = ['gefen', 'grape', 'wine'];
// Not food, or doesn't grow from the ground (mushrooms!) — no Kilayim, no Ma'aser
const NOT_FOOD = ['orange_tulip', 'daffodil', 'bamboo', 'mushroom', 'daisy', 'sunflower', 'rose', 'tulip', 'lavender', 'orchid',
  'candy_blossom', 'star_fruit', 'gragger', 'megillah', 'mask', 'crown', 'shofar', 'menorah', 'mishloach', 'bonfire', 'bow'];

// ─── Game numbers ───
const MITZVAH = {
  YEAR_CYCLE: 7,          // year 7 is Shemitah
  ORLAH_YEARS: 3,         // years 1-3 Orlah, year 4 Neta Revai
  KILAYIM_GAP: 1.0,       // empty dirt needed between two different kinds of plants
  VINE_GAP: 2.4,          // a vine needs more room (Kilai HaKerem)
  PEAH_W: 4.5, PEAH_D: 4.5,
  LEKET_CHANCE: 0.08,     // chance that a harvested fruit falls
  MAASER: 1 / 10,
};
// How much Terumah to give is the kid's choice (Mishnah Terumot 4:3).
// The blessing grows with generosity — on purpose it is NEVER shown before
// a sale, only revealed after it, so kids can discover it themselves.
const TERUMAH_CHOICES = {
  generous: { frac: 1 / 40, name: 'Generous eye', he: 'עַיִן יָפָה', emoji: '🤲', bless: 0.16 },
  average:  { frac: 1 / 50, name: 'Average',      he: 'בֵּינוֹנִית',  emoji: '🙂', bless: 0.12 },
  stingy:   { frac: 1 / 60, name: 'Stingy eye',   he: 'עַיִן רָעָה',  emoji: '🤏', bless: 0.09 },
};

// Generated from the Sefaria API (sefaria.org). Torah/Tanakh English: JPS 1917 (public domain).
// Mishnah English: Mishnah Yomit by Dr. Joshua Kulp (CC-BY). Hebrew: Sefaria (Miqra according to the Masorah / Torat Emet).
const SOURCES = {
 "lev19_9": {
  "ref": "Leviticus 19:9-10",
  "he": "וּבְקֻצְרְכֶם אֶת־קְצִיר אַרְצְכֶם לֹא תְכַלֶּה פְּאַת שָׂדְךָ לִקְצֹר וְלֶקֶט קְצִירְךָ לֹא תְלַקֵּט וְכַרְמְךָ לֹא תְעוֹלֵל וּפֶרֶט כַּרְמְךָ לֹא תְלַקֵּט לֶעָנִי וְלַגֵּר תַּעֲזֹב אֹתָם אֲנִי ה׳ אֱלֹקֵיכֶם",
  "en": "And when ye reap the harvest of your land, thou shalt not wholly reap the corner of thy field, neither shalt thou gather the gleaning of thy harvest. And thou shalt not glean thy vineyard, neither shalt thou gather the fallen fruit of thy vineyard; thou shalt leave them for the poor and for the stranger: I am the LORD your G-d."
 },
 "deut24_19": {
  "ref": "Deuteronomy 24:19",
  "he": "כִּי תִקְצֹר קְצִירְךָ בְשָׂדֶךָ וְשָׁכַחְתָּ עֹמֶר בַּשָּׂדֶה לֹא תָשׁוּב לְקַחְתּוֹ לַגֵּר לַיָּתוֹם וְלָאַלְמָנָה יִהְיֶה לְמַעַן יְבָרֶכְךָ ה׳ אֱלֹקֶיךָ בְּכֹל מַעֲשֵׂה יָדֶיךָ",
  "en": "When thou reapest thy harvest in thy field, and hast forgot a sheaf in the field, thou shalt not go back to fetch it; it shall be for the stranger, for the fatherless, and for the widow; that the LORD thy G-d may bless thee in all the work of thy hands."
 },
 "deut24_20": {
  "ref": "Deuteronomy 24:19-21",
  "he": "כִּי תִקְצֹר קְצִירְךָ בְשָׂדֶךָ וְשָׁכַחְתָּ עֹמֶר בַּשָּׂדֶה לֹא תָשׁוּב לְקַחְתּוֹ לַגֵּר לַיָּתוֹם וְלָאַלְמָנָה יִהְיֶה לְמַעַן יְבָרֶכְךָ ה׳ אֱלֹקֶיךָ בְּכֹל מַעֲשֵׂה יָדֶיךָ כִּי תַחְבֹּט זֵיתְךָ לֹא תְפַאֵר אַחֲרֶיךָ לַגֵּר לַיָּתוֹם וְלָאַלְמָנָה יִהְיֶה כִּי תִבְצֹר כַּרְמְךָ לֹא תְעוֹלֵל אַחֲרֶיךָ לַגֵּר לַיָּתוֹם וְלָאַלְמָנָה יִהְיֶה",
  "en": "When thou reapest thy harvest in thy field, and hast forgot a sheaf in the field, thou shalt not go back to fetch it; it shall be for the stranger, for the fatherless, and for the widow; that the LORD thy G-d may bless thee in all the work of thy hands. When thou beatest thine olive-tree, thou shalt not go over the boughs again; it shall be for the stranger, for the fatherless, and for the widow. When thou gatherest the grapes of thy vineyard, thou shalt not glean it after thee; it shall be for the stranger, for the fatherless, and for the widow."
 },
 "lev19_19": {
  "ref": "Leviticus 19:19",
  "he": "אֶת־חֻקֹּתַי תִּשְׁמֹרוּ בְּהֶמְתְּךָ לֹא־תַרְבִּיעַ כִּלְאַיִם שָׂדְךָ לֹא־תִזְרַע כִּלְאָיִם וּבֶגֶד כִּלְאַיִם שַׁעַטְנֵז לֹא יַעֲלֶה עָלֶיךָ",
  "en": "Ye shall keep My statutes. Thou shalt not let thy cattle gender with a diverse kind; thou shalt not sow thy field with two kinds of seed; neither shall there come upon thee a garment of two kinds of stuff mingled together."
 },
 "deut22_9": {
  "ref": "Deuteronomy 22:9",
  "he": "לֹא־תִזְרַע כַּרְמְךָ כִּלְאָיִם פֶּן־תִּקְדַּשׁ הַמְלֵאָה הַזֶּרַע אֲשֶׁר תִּזְרָע וּתְבוּאַת הַכָּרֶם",
  "en": "Thou shalt not sow thy vineyard with two kinds of seed; lest the fulness of the seed which thou hast sown be forfeited together with the increase of the vineyard."
 },
 "deut22_11": {
  "ref": "Deuteronomy 22:11",
  "he": "לֹא תִלְבַּשׁ שַׁעַטְנֵז צֶמֶר וּפִשְׁתִּים יַחְדָּו",
  "en": "Thou shalt not wear a mingled stuff, wool and linen together."
 },
 "lev19_23": {
  "ref": "Leviticus 19:23-25",
  "he": "וְכִי־תָבֹאוּ אֶל־הָאָרֶץ וּנְטַעְתֶּם כׇּל־עֵץ מַאֲכָל וַעֲרַלְתֶּם עׇרְלָתוֹ אֶת־פִּרְיוֹ שָׁלֹשׁ שָׁנִים יִהְיֶה לָכֶם עֲרֵלִים לֹא יֵאָכֵל וּבַשָּׁנָה הָרְבִיעִת יִהְיֶה כׇּל־פִּרְיוֹ קֹדֶשׁ הִלּוּלִים לַיהֹוָה וּבַשָּׁנָה הַחֲמִישִׁת תֹּאכְלוּ אֶת־פִּרְיוֹ לְהוֹסִיף לָכֶם תְּבוּאָתוֹ אֲנִי ה׳ אֱלֹקֵיכֶם",
  "en": "And when ye shall come into the land, and shall have planted all manner of trees for food, then ye shall count the fruit thereof as forbidden; three years shall it be as forbidden unto you; it shall not be eaten. And in the fourth year all the fruit thereof shall be holy, for giving praise unto the LORD. But in the fifth year may ye eat of the fruit thereof, that it may yield unto you more richly the increase thereof: I am the LORD your G-d."
 },
 "deut26_2": {
  "ref": "Deuteronomy 26:2",
  "he": "וְלָקַחְתָּ מֵרֵאשִׁית כׇּל־פְּרִי הָאֲדָמָה אֲשֶׁר תָּבִיא מֵאַרְצְךָ אֲשֶׁר ה׳ אֱלֹקֶיךָ נֹתֵן לָךְ וְשַׂמְתָּ בַטֶּנֶא וְהָלַכְתָּ אֶל־הַמָּקוֹם אֲשֶׁר יִבְחַר ה׳ אֱלֹקֶיךָ לְשַׁכֵּן שְׁמוֹ שָׁם",
  "en": "that thou shalt take of the first of all the fruit of the ground, which thou shalt bring in from thy land that the LORD thy G-d giveth thee; and thou shalt put it in a basket and shalt go unto the place which the LORD thy G-d shall choose to cause His name to dwell there."
 },
 "deut26_10": {
  "ref": "Deuteronomy 26:10-11",
  "he": "וְעַתָּה הִנֵּה הֵבֵאתִי אֶת־רֵאשִׁית פְּרִי הָאֲדָמָה אֲשֶׁר־נָתַתָּה לִּי ה׳ וְהִנַּחְתּוֹ לִפְנֵי ה׳ אֱלֹקֶיךָ וְהִשְׁתַּחֲוִיתָ לִפְנֵי ה׳ אֱלֹקֶיךָ וְשָׂמַחְתָּ בְכׇל־הַטּוֹב אֲשֶׁר נָתַן־לְךָ ה׳ אֱלֹקֶיךָ וּלְבֵיתֶךָ אַתָּה וְהַלֵּוִי וְהַגֵּר אֲשֶׁר בְּקִרְבֶּךָ",
  "en": "And now, behold, I have brought the first of the fruit of the land, which Thou, O LORD, hast given me.’ And thou shalt set it down before the LORD thy G-d, and worship before the LORD thy G-d. And thou shalt rejoice in all the good which the LORD thy G-d hath given unto thee, and unto thy house, thou, and the Levite, and the stranger that is in the midst of thee."
 },
 "deut8_8": {
  "ref": "Deuteronomy 8:8",
  "he": "אֶרֶץ חִטָּה וּשְׂעֹרָה וְגֶפֶן וּתְאֵנָה וְרִמּוֹן אֶרֶץ־זֵית שֶׁמֶן וּדְבָשׁ",
  "en": "a land of wheat and barley, and vines and fig-trees and pomegranates; a land of olive-trees and honey;"
 },
 "deut14_22": {
  "ref": "Deuteronomy 14:22",
  "he": "עַשֵּׂר תְּעַשֵּׂר אֵת כׇּל־תְּבוּאַת זַרְעֶךָ הַיֹּצֵא הַשָּׂדֶה שָׁנָה שָׁנָה",
  "en": "Thou shalt surely tithe all the increase of thy seed, that which is brought forth in the field year by year."
 },
 "deut18_4": {
  "ref": "Deuteronomy 18:4",
  "he": "רֵאשִׁית דְּגָנְךָ תִּירֹשְׁךָ וְיִצְהָרֶךָ וְרֵאשִׁית גֵּז צֹאנְךָ תִּתֶּן־לוֹ",
  "en": "The first-fruits of thy corn, of thy wine, and of thine oil, and the first of the fleece of thy sheep, shalt thou give him."
 },
 "num18_26": {
  "ref": "Numbers 18:26",
  "he": "וְאֶל־הַלְוִיִּם תְּדַבֵּר וְאָמַרְתָּ אֲלֵהֶם כִּי־תִקְחוּ מֵאֵת בְּנֵי־יִשְׂרָאֵל אֶת־הַמַּעֲשֵׂר אֲשֶׁר נָתַתִּי לָכֶם מֵאִתָּם בְּנַחֲלַתְכֶם וַהֲרֵמֹתֶם מִמֶּנּוּ תְּרוּמַת ה׳ מַעֲשֵׂר מִן־הַמַּעֲשֵׂר",
  "en": "’Moreover thou shalt speak unto the Levites, and say unto them: When ye take of the children of Israel the tithe which I have given you from them for your inheritance, then ye shall set apart of it a gift for the LORD, even a tithe of the tithe."
 },
 "mal3_10": {
  "ref": "Malachi 3:10",
  "he": "הָבִיאוּ אֶת־כׇּל־הַמַּעֲשֵׂר אֶל־בֵּית הָאוֹצָר וִיהִי טֶרֶף בְּבֵיתִי וּבְחָנוּנִי נָא בָּזֹאת אָמַר ה׳ צְבָאוֹת אִם־לֹא אֶפְתַּח לָכֶם אֵת אֲרֻבּוֹת הַשָּׁמַיִם וַהֲרִיקֹתִי לָכֶם בְּרָכָה עַד־בְּלִי־דָי",
  "en": "Bring ye the whole tithe into the store-house, that there may be food in My house, and try Me now herewith, Saith the LORD of hosts, if I will not open you the windows of heaven, and pour you out a blessing, that there shall be more than sufficiency."
 },
 "lev25_3": {
  "ref": "Leviticus 25:3-4",
  "he": "שֵׁשׁ שָׁנִים תִּזְרַע שָׂדֶךָ וְשֵׁשׁ שָׁנִים תִּזְמֹר כַּרְמֶךָ וְאָסַפְתָּ אֶת־תְּבוּאָתָהּ וּבַשָּׁנָה הַשְּׁבִיעִת שַׁבַּת שַׁבָּתוֹן יִהְיֶה לָאָרֶץ שַׁבָּת לַיהֹוָה שָׂדְךָ לֹא תִזְרָע וְכַרְמְךָ לֹא תִזְמֹר",
  "en": "Six years thou shalt sow thy field, and six years thou shalt prune thy vineyard, and gather in the produce thereof. But in the seventh year shall be a sabbath of solemn rest for the land, a sabbath unto the LORD; thou shalt neither sow thy field, nor prune thy vineyard."
 },
 "lev25_21": {
  "ref": "Leviticus 25:20-21",
  "he": "וְכִי תֹאמְרוּ מַה־נֹּאכַל בַּשָּׁנָה הַשְּׁבִיעִת הֵן לֹא נִזְרָע וְלֹא נֶאֱסֹף אֶת־תְּבוּאָתֵנוּ וְצִוִּיתִי אֶת־בִּרְכָתִי לָכֶם בַּשָּׁנָה הַשִּׁשִּׁית וְעָשָׂת אֶת־הַתְּבוּאָה לִשְׁלֹשׁ הַשָּׁנִים",
  "en": "And if ye shall say: ‘What shall we eat the seventh year? behold, we may not sow, nor gather in our increase’; then I will command My blessing upon you in the sixth year, and it shall bring forth produce for the three years."
 },
 "ex23_11": {
  "ref": "Exodus 23:11",
  "he": "וְהַשְּׁבִיעִת תִּשְׁמְטֶנָּה וּנְטַשְׁתָּהּ וְאָכְלוּ אֶבְיֹנֵי עַמֶּךָ וְיִתְרָם תֹּאכַל חַיַּת הַשָּׂדֶה כֵּן־תַּעֲשֶׂה לְכַרְמְךָ לְזֵיתֶךָ",
  "en": "but the seventh year thou shalt let it rest and lie fallow, that the poor of thy people may eat; and what they leave the beast of the field shall eat. In like manner thou shalt deal with thy vineyard, and with thy oliveyard."
 },
 "deut20_19": {
  "ref": "Deuteronomy 20:19",
  "he": "כִּי־תָצוּר אֶל־עִיר יָמִים רַבִּים לְהִלָּחֵם עָלֶיהָ לְתׇפְשָׂהּ לֹא־תַשְׁחִית אֶת־עֵצָהּ לִנְדֹּחַ עָלָיו גַּרְזֶן כִּי מִמֶּנּוּ תֹאכֵל וְאֹתוֹ לֹא תִכְרֹת כִּי הָאָדָם עֵץ הַשָּׂדֶה לָבֹא מִפָּנֶיךָ בַּמָּצוֹר",
  "en": "When thou shalt besiege a city a long time, in making war against it to take it, thou shalt not destroy the trees thereof by wielding an axe against them; for thou mayest eat of them, but thou shalt not cut them down; for is the tree of the field man, that it should be besieged of thee?"
 },
 "ruth2_2": {
  "ref": "Ruth 2:2-3",
  "he": "וַתֹּאמֶר רוּת הַמּוֹאֲבִיָּה אֶל־נׇעֳמִי אֵלְכָה־נָּא הַשָּׂדֶה וַאֲלַקֳּטָה בַשִּׁבֳּלִים אַחַר אֲשֶׁר אֶמְצָא־חֵן בְּעֵינָיו וַתֹּאמֶר לָהּ לְכִי בִתִּי וַתֵּלֶךְ וַתָּבוֹא וַתְּלַקֵּט בַּשָּׂדֶה אַחֲרֵי הַקֹּצְרִים וַיִּקֶר מִקְרֶהָ חֶלְקַת הַשָּׂדֶה לְבֹעַז אֲשֶׁר מִמִּשְׁפַּחַת אֱלִימֶלֶךְ",
  "en": "And Ruth the Moabitess said unto Naomi: ‘Let me now go to the field, and glean among the ears of corn after him in whose sight I shall find favour.’ And she said unto her: ‘Go, my daughter.’ And she went, and came and gleaned in the field after the reapers; and her hap was to light on the portion of the field belonging unto Boaz, who was of the family of Elimelech."
 },
 "ruth2_16": {
  "ref": "Ruth 2:15-16",
  "he": "וַתָּקׇם לְלַקֵּט וַיְצַו בֹּעַז אֶת־נְעָרָיו לֵאמֹר גַּם בֵּין הָעֳמָרִים תְּלַקֵּט וְלֹא תַכְלִימוּהָ וְגַם שֹׁל־תָּשֹׁלּוּ לָהּ מִן־הַצְּבָתִים וַעֲזַבְתֶּם וְלִקְּטָה וְלֹא תִגְעֲרוּ־בָהּ",
  "en": "And when she was risen up to glean, Boaz commanded his young men, saying: ‘Let her glean even among the sheaves, and put her not to shame. And also pull out some for her of purpose from the bundles, and leave it, and let her glean, and rebuke her not.’"
 },
 "m_peah1_1": {
  "ref": "Mishnah Peah 1:1",
  "he": "אֵלּוּ דְבָרִים שֶׁאֵין לָהֶם שִׁעוּר. הַפֵּאָה, וְהַבִּכּוּרִים, וְהָרֵאָיוֹן, וּגְמִילוּת חֲסָדִים, וְתַלְמוּד תּוֹרָה. אֵלּוּ דְבָרִים שֶׁאָדָם אוֹכֵל פֵּרוֹתֵיהֶן בָּעוֹלָם הַזֶּה וְהַקֶּרֶן קַיֶּמֶת לוֹ לָעוֹלָם הַבָּא. כִּבּוּד אָב וָאֵם, וּגְמִילוּת חֲסָדִים, וַהֲבָאַת שָׁלוֹם בֵּין אָדָם לַחֲבֵרוֹ, וְתַלְמוּד תּוֹרָה כְּנֶגֶד כֻּלָּם:",
  "en": "These are the things that have no definite quantity: The corners [of the field]. First-fruits; [The offerings brought] on appearing [at the Temple on the three pilgrimage festivals]. The performance of righteous deeds; And the study of the torah."
 },
 "m_peah1_2": {
  "ref": "Mishnah Peah 1:2",
  "he": "אֵין פּוֹחֲתִין לַפֵּאָה מִשִּׁשִּׁים, וְאַף עַל פִּי שֶׁאָמְרוּ אֵין לַפֵּאָה שִׁעוּר. הַכֹּל לְפִי גֹדֶל הַשָּׂדֶה, וּלְפִי רֹב הָעֲנִיִּים, וּלְפִי רֹב הָעֲנָוָה:",
  "en": "They should not leave peah of less than one-sixtieth [of the field]. But even though they said, “there is no measure for peah,” everything depends upon the size of the field, the number of poor people, and the extent of the yield."
 },
 "m_peah4_10": {
  "ref": "Mishnah Peah 4:10",
  "he": "אֵיזֶהוּ לֶקֶט, הַנּוֹשֵׁר בִּשְׁעַת הַקְּצִירָה.",
  "en": "What are gleanings? That which falls down at the time of harvesting."
 },
 "m_peah6_5": {
  "ref": "Mishnah Peah 6:5",
  "he": "שְׁנֵי עֳמָרִים, שִׁכְחָה, וּשְׁלשָׁה אֵינָן שִׁכְחָה. שְׁנֵי צִבּוּרֵי זֵיתִים וְחָרוּבִין, שִׁכְחָה, וּשְׁלשָׁה אֵינָן שִׁכְחָה. שְׁנֵי הוּצְנֵי פִשְׁתָּן, שִׁכְחָה, וּשְׁלשָׁה אֵינָן שִׁכְחָה.",
  "en": "Two sheaves [left lying together] are “forgotten,” but three are not “forgotten.” Two bundles of olives or carobs are “forgotten” but three are not “forgotten.” Two flax-stalks are “forgotten”, but three are not “forgotten”. Two grapes are considered “grape gleanings,” but three are not “grape gleanings.” Two ears of grain are deemed “gleanings,” but three are not gleanings.” All these [rulings] are according to Bet Hillel. And concerning them all Bet Shammai says that three [that are left] belong to the poor, and four belong to the owner."
 },
 "m_kil1_1": {
  "ref": "Mishnah Kilayim 1:1",
  "he": "הַחִטִּים וְהַזּוּנִין אֵינָן כִּלְאַיִם זֶה בָזֶה. הַשְּׂעֹרִים וְשִׁבֹּלֶת שׁוּעָל, הַכֻּסְּמִין וְהַשִּׁיפוֹן, הַפּוֹל וְהַסַּפִּיר, הַפֻּרְקְדָן וְהַטֹּפֵחַ, וּפוֹל הַלָּבָן וְהַשְּׁעוּעִים, אֵינָם כִּלְאַיִם זֶה בָזֶה:",
  "en": "Wheat and zunin do not constitute kilayim one with the other. Barley and oats, spelt and rye, or beans and sapir (a type of bean), or purkdan and tofah (two similar types of beans), or white beans and kidney beans, do not constitute kilayim one with the other."
 },
 "m_kil9_1": {
  "ref": "Mishnah Kilayim 9:1",
  "he": "אֵין אָסוּר מִשּׁוּם כִּלְאַיִם אֶלָּא צֶמֶר וּפִשְׁתִּים.",
  "en": "Nothing is forbidden on account of kilayim except [a mixture of] wool and linen."
 },
 "m_orlah1_2": {
  "ref": "Mishnah Orlah 1:2",
  "he": "עֵת שֶׁבָּאוּ אֲבוֹתֵינוּ לָאָרֶץ, מָצְאוּ נָטוּעַ, פָּטוּר.",
  "en": "If at the time when our ancestors came into the land and they found [a tree already] planted it was exempt [from the laws of orlah]."
 },
 "m_bik1_3": {
  "ref": "Mishnah Bikkurim 1:3",
  "he": "אֵין מְבִיאִין בִּכּוּרִים חוּץ מִשִּׁבְעַת הַמִּינִים.",
  "en": "Bikkurim are brought only from the seven species."
 },
 "m_bik3_1": {
  "ref": "Mishnah Bikkurim 3:1",
  "he": "כֵּיצַד מַפְרִישִׁין הַבִּכּוּרִים. יוֹרֵד אָדָם בְּתוֹךְ שָׂדֵהוּ וְרוֹאֶה תְּאֵנָה שֶׁבִּכְּרָה, אֶשְׁכּוֹל שֶׁבִּכֵּר, רִמּוֹן שֶׁבִּכֵּר, קוֹשְׁרוֹ בְגֶמִי, וְאוֹמֵר, הֲרֵי אֵלּוּ בִּכּוּרִים. רַבִּי שִׁמְעוֹן אוֹמֵר, אַף עַל פִּי כֵן חוֹזֵר וְקוֹרֵא אוֹתָם בִּכּוּרִים מֵאַחַר שֶׁיִּתָּלְשׁוּ מִן הַקַּרְקָע:",
  "en": "How does one set aside bikkurim? A man goes down into his field, he sees a fig that ripened, or a cluster of grapes that ripened, or a pomegranate that ripened, he ties a reed-rope around it and says: “Let these be bikkurim.” Rabbi Shimon says: even so, he must again designate them as bikkurim after they have been plucked from the soil."
 },
 "m_bik3_3": {
  "ref": "Mishnah Bikkurim 3:3",
  "he": "הַקְּרוֹבִים מְבִיאִים הַתְּאֵנִים וְהָעֲנָבִים, וְהָרְחוֹקִים מְבִיאִים גְּרוֹגָרוֹת וְצִמּוּקִים. וְהַשּׁוֹר הוֹלֵךְ לִפְנֵיהֶם, וְקַרְנָיו מְצֻפּוֹת זָהָב, וַעֲטֶרֶת שֶׁל זַיִת בְּרֹאשׁוֹ. הֶחָלִיל מַכֶּה לִפְנֵיהֶם, עַד שֶׁמַּגִּיעִים קָרוֹב לִירוּשָׁלָיִם. הִגִּיעוּ קָרוֹב לִירוּשָׁלַיִם, שָׁלְחוּ לִפְנֵיהֶם, וְעִטְּרוּ אֶת בִּכּוּרֵיהֶם.",
  "en": "Those who lived near [Jerusalem] would bring fresh figs and grapes, while those who lived far away would bring dried figs and raisins. An ox would go in front of them, his horns bedecked with gold and with an olive-crown on its head. The flute would play before them until they would draw close to Jerusalem. When they drew close to Jerusalem they would send messengers in advance, and they would adorn their bikkurim."
 },
 "m_maasrot1_1": {
  "ref": "Mishnah Maasrot 1:1",
  "he": "כְּלָל אָמְרוּ בַּמַּעַשְׂרוֹת, כָּל שֶׁהוּא אֹכֶל, וְנִשְׁמָר, וְגִדּוּלָיו מִן הָאָרֶץ, חַיָּב בַּמַּעַשְׂרוֹת. וְעוֹד כְּלָל אַחֵר אָמְרוּ, כָּל שֶׁתְּחִלָּתוֹ אֹכֶל וְסוֹפוֹ אֹכֶל, אַף עַל פִּי שֶׁהוּא שׁוֹמְרוֹ לְהוֹסִיף אֹכֶל, חַיָּב קָטָן וְגָדוֹל. וְכָל שֶׁאֵין תְּחִלָּתוֹ אֹכֶל אֲבָל סוֹפוֹ אֹכֶל, אֵינוֹ חַיָּב עַד שֶׁיֵּעָשֶׂה אֹכֶל:",
  "en": "They said a general principle concerning tithes: whatever is food, and is looked after, and grows from the land, is liable for tithes."
 },
 "m_terumot4_3": {
  "ref": "Mishnah Terumot 4:3",
  "he": "שִׁעוּר תְּרוּמָה, עַיִן יָפָה, אֶחָד מֵאַרְבָּעִים. בֵּית שַׁמַּאי אוֹמְרִים, מִשְּׁלֹשִׁים. וְהַבֵּינוֹנִית, מֵחֲמִשִּׁים. וְהָרָעָה, מִשִּׁשִּׁים. תָּרַם וְעָלָה בְיָדוֹ אֶחָד מִשִּׁשִּׁים, תְּרוּמָה, וְאֵינוֹ צָרִיךְ לִתְרֹם. חָזַר וְהוֹסִיף, חַיָּב בְּמַעַשְׂרוֹת. עָלָה בְיָדוֹ מִשִּׁשִּׁים וְאֶחָד, תְּרוּמָה, וְיַחֲזֹר וְיִתְרֹם כְּמוֹת שֶׁהוּא לָמוּד, בְּמִדָּה וּבְמִשְׁקָל וּבְמִנְיָן. רַבִּי יְהוּדָה אוֹמֵר, אַף שֶׁלֹּא מִן הַמֻּקָּף:",
  "en": "The amount of terumah: A generous amount: one fortieth. Beth Shammai say: one thirtieth. The average amount: one fiftieth. A stingy amount: one sixtieth."
 }
};

// ─── The mitzvot, as shown in the 📜 Mitzvot book ───
const MITZVOT = [
  { id: 'peah', emoji: '💙', he: 'פֵּאָה', name: 'Peah — the corner of the field',
    what: "When you harvest, you don't cut the corner of your field. You leave it for poor people to take.",
    game: 'Every garden has a blue-roped <b>Peah corner</b>. Plant in it — but when it is ripe, leave it! Rut comes to take it, and Hashem blesses you.',
    sources: ['lev19_9', 'm_peah1_1', 'm_peah1_2'], stat: 'peah', unit: 'gifts left in the corner' },
  { id: 'leket', emoji: '🌾', he: 'לֶקֶט', name: 'Leket — what falls',
    what: "If one or two stalks fall while you're harvesting, you don't pick them up. They belong to the poor.",
    game: "Sometimes a fruit falls when you harvest. That's <b>Leket</b> — leave it on the ground for Rut.",
    sources: ['lev19_9', 'm_peah4_10', 'm_peah6_5'], stat: 'leket', unit: 'fallen fruit left' },
  { id: 'shichecha', emoji: '🧺', he: 'שִׁכְחָה', name: 'Shichecha — the forgotten bundle',
    what: "If you forget something in the field and already walked past it, don't go back for it. It's for the poor — and Hashem blesses you for it!",
    game: 'Walk out of your garden after harvesting and leave 1 or 2 ripe plants behind? They become <b>Shichecha</b>. Three or more are not "forgotten" — they\'re still yours!',
    sources: ['deut24_19', 'm_peah6_5', 'ruth2_16'], stat: 'shich', unit: 'forgotten gifts' },
  { id: 'kilayim', emoji: '🚧', he: 'כִּלְאַיִם', name: 'Kilayim — keep kinds apart',
    what: "Don't plant two different kinds of seeds mixed together. Each kind gets its own space. Vines need extra room.",
    game: 'Planting a different kind right next to another one turns the spot <b>red</b>. Leave a little dirt between kinds. Trees, flowers and mushrooms are fine.',
    fact: 'Shatnez is Kilayim too: not wearing wool and linen together. Every outfit in this game is shatnez-free! 🧵',
    sources: ['lev19_19', 'deut22_9', 'm_kil1_1', 'deut22_11'], stat: 'kil', unit: 'plantings kept apart' },
  { id: 'orlah', emoji: '🌱', he: 'עׇרְלָה', name: "Orlah — a young tree's fruit",
    what: "A new fruit tree's fruit is not eaten for its first three years.",
    game: 'Fruit trees you plant are <b>Orlah</b> for 3 garden years (every day in the game is one garden year). After that, their fruit falls away and new fruit grows for you.',
    fact: 'Trees that were already growing in your garden before this update are like the trees our ancestors found when they came into the Land — no Orlah! (Mishnah Orlah 1:2)',
    sources: ['lev19_23', 'm_orlah1_2'], stat: 'orlah', unit: 'trees that finished Orlah' },
  { id: 'revai', emoji: '🏛️', he: 'נֶטַע רְבָעִי', name: 'Neta Revai — the 4th year',
    what: 'In its fourth year, a tree\'s fruit is holy. It was eaten in Yerushalayim, praising Hashem.',
    game: 'Fruit from a tree in its 4th year is <b>Revai</b>. Bring it to the Kohen 🏛️ instead of selling it to Steven.',
    sources: ['lev19_23'], stat: 'revai', unit: 'Revai fruit brought' },
  { id: 'bikkurim', emoji: '🎀', he: 'בִּכּוּרִים', name: 'Bikkurim — first fruits',
    what: 'The first fruit of the Seven Species was brought in a basket to the Beit HaMikdash and given to the Kohen.',
    game: 'When a Seven Species plant ripens for the first time, <b>tie a reed</b> around it and say "These are Bikkurim!" Then bring them to the Kohen 🏛️. Can you bring all seven?',
    fact: 'In the real Beit HaMikdash, Bikkurim were brought starting from Shavuot.',
    sources: ['deut26_2', 'deut8_8', 'm_bik3_1', 'm_bik1_3', 'm_bik3_3'], stat: 'bik', unit: 'of the Seven Species brought' },
  { id: 'maaser', emoji: '🪙', he: 'תְּרוּמוֹת וּמַעַשְׂרוֹת', name: "Terumah & Ma'aser — giving a share",
    what: 'Before eating your crops, you give Terumah to the Kohen and one tenth (Ma\'aser) to the Levi.',
    game: 'When you sell to Steven, <b>you choose</b> how much Terumah to give the Kohen — a generous eye gives 1/40, an average one 1/50, a stingy eye 1/60. Then Ma\'aser (1/10) goes to the Levi, and Hashem sends a <b>blessing</b>. Flowers and mushrooms aren\'t food, so they have no Ma\'aser.',
    fact: 'Our Sages said: "Aser bishvil shetitasher" — give a tenth so that you will become rich! (Taanit 9a)',
    sources: ['deut14_22', 'deut18_4', 'm_terumot4_3', 'm_maasrot1_1', 'mal3_10'], stat: 'maaser', unit: 'sales with Ma\'aser' },
  { id: 'shemitah', emoji: '🌿', he: 'שְׁמִטָּה', name: 'Shemitah — the land rests',
    what: 'Every seventh year we don\'t plant. What grows by itself belongs to everyone, and the land rests. Hashem promised a blessing in the sixth year!',
    game: 'Every 7th garden year is <b>Shemitah</b>: no planting, and fruit you pick is holy Shevi\'it fruit — eat it, don\'t sell it. In year 6, every harvest is <b>doubled</b>!',
    sources: ['lev25_3', 'ex23_11', 'lev25_21'], stat: 'shemitah', unit: 'Shemitah years kept' },
  { id: 'tashchit', emoji: '🌳', he: 'בַּל תַּשְׁחִית', name: "Bal Tashchit — don't destroy trees",
    what: 'The Torah says not to cut down fruit trees. We take care of the good things Hashem gave us.',
    game: 'Digging up a fruit tree with the shovel asks you to think twice.',
    sources: ['deut20_19'], stat: null },
];
