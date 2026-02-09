import { qdrant } from "./vectorDB.js";
import { embedOne } from "./embedding.js";

function tokenKey(token) {
  return "prod_v2_university";
}

function detectTechnologies(questionText) {
  const text = questionText.toLowerCase();
  const detectedTechs = [];
  
  const patterns = {
    // ==================== PROGRAMMING LANGUAGES (From Corporate) ====================
    
// ✅ C++ MUST BE FIRST (most specific)
  'cplusplus': /\b(c\+\+|cpp|class\s+\w+\s*\{|class\s+\w+\s*:|protected\s+\w+|public\s+\w+|private\s+\w+|#include\s*<iostream>|#include\s*<|std::|cout\s*<<|cin\s*>>|namespace|template<|vector<|virtual|override|\.cpp\b|\.hpp\b|inheritance|polymorphism|encapsulation|constructor|destructor|operator\s+overload|::\w+)/i,
  
  // ✅ JAVA (specific to Java)
  'java': /\b(java\b|public\s+class\s+\w+\s*\{|public\s+static\s+void\s+main|System\.out|import\s+java\.|\.java\b|extends\s+\w+\s*\{|implements\s+\w+|package\s+|@Override|@Entity|@Component|synchronized|volatile|transient|serializable|jvm|jdk|maven|gradle)/i,
  
  // ✅ C (specific, no C++ features)
  'c': /\b(#include\s*<stdio\.h>|#include\s*<stdlib\.h>|printf\s*\(|scanf\s*\(|malloc\s*\(|free\s*\(|struct\s+\w+\s*\{(?!.*(?:public|private|protected|virtual|namespace|std::)))/i,
  
  // ✅ PYTHON (very specific)
  'python': /\b(python|def\s+\w+\s*\(|import\s+\w+|from\s+\w+\s+import|print\s*\(|if\s+__name__|\.py\b|pip\s+install|lambda\s*\w*:|self\.|__init__|class\s+\w+\s*\(|for\s+\w+\s+in\s+range|\.append\(|\.extend\(|django|flask|pandas|numpy)/i,
  
  // ✅ PHP (very specific - requires $ or <?php)
  'php': /\b(php|<\?php|\$\w+\s*=|\$this->|echo\s+\$|mysqli_|pdo|composer|laravel|symfony|wordpress|\.php\b)/i,
  
  // ✅ RUBY (very specific - requires 'def' or 'end' or .rb)
  'ruby': /\b(ruby|def\s+\w+|end\b|\.rb\b|puts\s+|require\s+['"]|gem\s+['"]|rails|rake|bundle|module\s+\w+|attr_accessor|attr_reader|@\w+\s*=)/i,
  
  // ✅ SWIFT (very specific - requires Swift keywords)
  'swift': /\b(swift|func\s+\w+\s*\(|let\s+\w+\s*:|var\s+\w+\s*:|\.swift\b|protocol\s+\w+\s*\{|extension\s+\w+|guard\s+let|defer\s*\{|optional|unwrap|\?\?|\.self)/i,
  
  'javascript': /\b(javascript|js\b|ecmascript|console\.log|console\.error|let\s+\w+\s*=|const\s+\w+\s*=|var\s+\w+\s*=|=>\s*\{|function\s*\(|\.js\b|node|npm|yarn|typeof|instanceof|promise|async\s+function|await\s+|callback|closure|prototype|this\.)/i,
  
  'typescript': /\b(typescript|ts\b|interface\s+\w+\s*\{|type\s+\w+\s*=|enum\s+\w+\s*\{|\.ts\b|\.tsx\b|generic|implements\s+\w+|namespace|decorator|@types|tsc\b|tsconfig)/i,
  
  'csharp': /\b(c#|csharp|using\s+System|namespace\s+\w+|Console\.WriteLine|\.cs\b|async\s+Task|await\s+|linq|entity\s+framework|\.net|public\s+void|private\s+void|interface\s+I\w+|delegate|event\s+)/i,
  
  'go': /\b(golang?|go\b|package\s+main|func\s+\w+\s*\(|import\s+\(|\.go\b|goroutine|channel|defer\s+|interface\{\}|struct\s*\{|make\(|:=\s+)/i,
  
  'rust': /\b(rust|fn\s+\w+|let\s+mut|cargo|\.rs\b|impl\s+\w+|trait\s+\w+|struct\s+\w+|enum\s+\w+|match\s+\w+|ownership|borrow|lifetime)/i,
  
  'kotlin': /\b(kotlin|fun\s+\w+|val\s+\w+|var\s+\w+|\.kt\b|data\s+class|sealed\s+class|companion\s+object|coroutine|suspend\s+fun|when\s*\{|lateinit)/i,
  
  // ==================== FRONTEND ====================
    
    'react': /\b(react|reactjs|useState|useEffect|useContext|useReducer|useMemo|useCallback|useRef|jsx|tsx|props\b|component|render|virtual\s+dom|react\s+hook|functional\s+component|class\s+component)/i,
    
    'angular': /\b(angular|angularjs|@Component|@Injectable|@Input|@Output|@Directive|@Pipe|ng\b|ngOnInit|ngOnDestroy|ngOnChanges|\.component\.ts|\.service\.ts|\.module\.ts)/i,
    
    'vue': /\b(vue|vuejs|vue\.js|v-if|v-else|v-for|v-bind|v-model|v-on|<template>|<script\s+setup>|computed|watch|methods|data\(\)|props|emit)/i,

    // ==================== BACKEND ====================
    
    'nodejs': /\b(node|nodejs|node\.js|require\s*\(|module\.exports|export\s+default|npm\b|npx|yarn|package\.json|process\.env|express|middleware)/i,
    
    'express': /\b(express|app\.get|app\.post|app\.put|app\.delete|app\.use|router\.|req\.|res\.|next\(|middleware)/i,
    
    'django': /\b(django|from\s+django|models\.Model|views\.py|urls\.py|settings\.py|manage\.py|orm|queryset|migration|template)/i,
    
    'flask': /\b(flask|from\s+flask|@app\.route|render_template|jsonify|request\.|session\.|blueprints)/i,
    
    'springboot': /\b(spring\s+boot|springboot|@SpringBootApplication|@RestController|@Controller|@Service|@Repository|@Component|@Autowired|@RequestMapping|@GetMapping|@PostMapping)/i,
    
    'spring': /\b(spring|springframework|@Component|@Service|@Repository|@Configuration|@Bean|bean|dependency\s+injection|ioc|aop)/i,

    // ==================== DATABASES ====================
    
    'mysql': /\b(mysql|my\s+sql|mysql\s+database|SHOW\s+TABLES|SHOW\s+DATABASES|DESCRIBE\s+|mysqldump|innodb|myisam)/i,
    
    'postgresql': /\b(postgres|postgresql|psql|pg_dump|pg_restore|pgadmin|postgis|jsonb)/i,
    
    'mongodb': /\b(mongodb|mongo\s+db|mongo|mongoose|db\.collection|findOne|findMany|insertOne|updateOne|deleteOne|aggregate|nosql|bson)/i,
    
    'redis': /\b(redis|HSET|HGET|LPUSH|RPUSH|LPOP|SADD|ZADD|redis-cli|cache|key-value)/i,
    
    'sql': /\b(SELECT\s+[\w*,\s]+\s+FROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|JOIN\s+|WHERE\s+|GROUP\s+BY|ORDER\s+BY|HAVING\s+|PRIMARY\s+KEY|FOREIGN\s+KEY|sql\s+query|relational\s+database|rdbms)/i,
    
    'dbms': /\b(dbms|database\s+management|relational\s+database|normalization|acid|transaction|concurrency|deadlock|entity|schema|query\s+optimization)/i,
    
    'rdbms': /\b(rdbms|relational\s+database|table|row|column|primary\s+key|foreign\s+key|join|index|constraint)/i,

    // ==================== ORM ====================
    
    'hibernate': /\b(hibernate|@Entity|@Table|@Column|@Id|@GeneratedValue|@OneToMany|@ManyToOne|SessionFactory|hql|lazy\s+loading|cascade)/i,
    
    'jpa': /\b(jpa|java\s+persistence\s+api|EntityManager|@PersistenceContext|persist\(|merge\(|find\()/i,

    // ==================== WEB TECHNOLOGIES ====================
    
    'html': /\b(html|html5|markup|<html|<head|<body|<div|<span|<p>|<h[1-6]>|<table|<form|<button|<a\s+href|<img\s+src|semantic\s+html|dom)/i,
    
    'css': /\b(css|css3|stylesheet|cascading\s+style|margin\s*:|padding\s*:|color\s*:|background\s*:|display\s*:|position\s*:|flex\b|flexbox|grid\b|selector|box\s+model|responsive)/i,
    
    'bootstrap': /\b(bootstrap|container|row|col-|btn\s+btn-|navbar|card|modal|alert|responsive\s+grid)/i,

    // ==================== CLOUD / DEVOPS ====================
    
    'docker': /\b(docker|dockerfile|docker-compose|container|image|volume|docker\s+build|docker\s+run|containerization)/i,
    
    'kubernetes': /\b(kubernetes|k8s|kubectl|pod|deployment|service|ingress|configmap|namespace|helm|cluster)/i,
    
    'aws': /\b(aws|amazon\s+web\s+services|ec2|s3|lambda|rds|dynamodb|elasticache|cloudfront|iam|vpc)/i,
    
    'azure': /\b(azure|microsoft\s+azure|app\s+service|azure\s+functions|blob\s+storage|cosmos\s+db|virtual\s+machine)/i,
    
    'gcp': /\b(gcp|google\s+cloud|compute\s+engine|app\s+engine|cloud\s+storage|bigquery|firebase)/i,

    // ==================== BUILD TOOLS ====================
    
    'maven': /\b(maven|pom\.xml|mvn\s+|<dependency>|<plugin>|artifactId|groupId)/i,
    
    'gradle': /\b(gradle|build\.gradle|gradlew|dependencies\s*\{|implementation)/i,

    // ==================== TESTING ====================
    
    'jest': /\b(jest|describe\s*\(|it\s*\(|test\s*\(|expect\s*\(|toBe|toEqual|mock|spy)/i,
    
    'junit': /\b(junit|@Test|@Before|@After|assertEquals|assertTrue|assertFalse|test\s+case)/i,

    // ==================== VERSION CONTROL ====================
    
    'git': /\b(git|git\s+init|git\s+clone|git\s+commit|git\s+push|git\s+pull|git\s+merge|git\s+branch|github|gitlab|version\s+control|repository)/i,

    // ==================== DATA SCIENCE & ML ====================
    
    'machinelearning': /\b(machine\s+learning|ml\b|supervised|unsupervised|classification|regression|neural\s+network|deep\s+learning|training\s+data|model|algorithm|feature|dataset)/i,
    
    'datascience': /\b(data\s+science|data\s+analysis|data\s+mining|big\s+data|analytics|visualization|statistics|pandas|numpy|scikit)/i,
    
    'rprogramming': /\b(r\s+programming|\br\b|rstudio|ggplot|dplyr|tidyverse|data\.frame|vector|matrix|statistical\s+analysis)/i,

    // ==================== ALGORITHMS & DATA STRUCTURES ====================
    
    'algorithms': /\b(algorithm|time\s+complexity|space\s+complexity|big\s+o|sorting|searching|binary\s+search|linear\s+search|bubble\s+sort|merge\s+sort|quick\s+sort|dynamic\s+programming|greedy|divide\s+and\s+conquer|recursion|iteration)/i,
    
    'datastructure': /\b(data\s+structure|array|linked\s+list|stack|queue|tree|binary\s+tree|graph|hash\s+table|heap|priority\s+queue|dsa\b)/i,

    // ==================== ACADEMIC SUBJECTS ====================
    
    'mathematics': /\b(mathematics|math|calculus|algebra|trigonometry|geometry|statistics|probability|differential|integral|equation|theorem|proof|matrix|determinant)/i,
    
    'physics': /\b(physics|mechanics|thermodynamics|electromagnetism|quantum|relativity|force|energy|momentum|velocity|acceleration|newton|law\s+of\s+motion)/i,
    
    'chemistry': /\b(chemistry|chemical|molecule|atom|element|compound|reaction|organic|inorganic|periodic\s+table|bond|electron|proton)/i,
    
    'biology': /\b(biology|cell|dna|rna|gene|protein|organism|evolution|photosynthesis|respiration|mitosis|meiosis|ecology)/i,
    
    'biotechnology': /\b(biotechnology|genetic\s+engineering|cloning|bioinformatics|molecular\s+biology|immunology|enzyme|fermentation)/i,

    // ==================== ENGINEERING SUBJECTS ====================
    
    'computernetworks': /\b(computer\s+network|network|tcp|ip|osi\s+model|router|switch|protocol|lan|wan|ethernet|packet|routing|subnet)/i,
    
    'operatingsystems': /\b(operating\s+system|os\b|process|thread|scheduling|memory\s+management|virtual\s+memory|deadlock|semaphore|mutex|kernel|file\s+system)/i,
    
    'cryptography': /\b(cryptography|encryption|decryption|cipher|hash|rsa|aes|public\s+key|private\s+key|digital\s+signature|ssl|tls)/i,
    
    'digitalforensics': /\b(digital\s+forensics|forensics|cyber\s+security|penetration\s+testing|vulnerability|malware|incident\s+response)/i,

    // ==================== BUSINESS & COMMERCE ====================
    
    'accounting': /\b(accounting|balance\s+sheet|income\s+statement|asset|liability|equity|debit|credit|journal|ledger|trial\s+balance|depreciation|audit)/i,
    
    'finance': /\b(finance|investment|portfolio|stock|bond|interest\s+rate|financial\s+statement|capital|revenue|profit|loss)/i,
    
    'commerce': /\b(commerce|business|trade|market|economics|supply|demand|price|consumer|producer|competition)/i,
    
    'management': /\b(management|business\s+administration|bba|organization|leadership|planning|strategy|human\s+resource|hr|marketing|operations)/i,

    // ==================== HUMANITIES & LANGUAGES ====================
    
    'english': /\b(english|grammar|literature|essay|comprehension|vocabulary|tense|article|preposition|conjunction)/i,
    
    'tamil': /\b(tamil|தமிழ்|இலக்கணம்|இலக்கியம்)/i,
    
    'french': /\b(french|français|grammar|vocabulary|conjugation|accent)/i,
    
    'hindi': /\b(hindi|हिंदी|व्याकरण|साहित्य)/i,

    // ==================== APTITUDE & SOFT SKILLS ====================
    
    'aptitude': /\b(aptitude|reasoning|logical|quantitative|numerical|verbal|problem\s+solving|puzzle|pattern|sequence|series)/i,
    
    'softskills': /\b(soft\s+skill|communication|presentation|teamwork|leadership|time\s+management|problem\s+solving|critical\s+thinking|interpersonal)/i,

    // ==================== GENERAL STUDIES ====================
    
    'history': /\b(history|ancient|medieval|modern|civilization|dynasty|empire|independence|colonial|freedom\s+struggle)/i,
    
    'geography': /\b(geography|continent|country|capital|river|mountain|climate|latitude|longitude|map|terrain)/i,
    
    'polity': /\b(polity|constitution|government|democracy|parliament|legislature|executive|judiciary|fundamental\s+rights|directive\s+principles)/i,
    
    'economy': /\b(economy|gdp|inflation|fiscal|monetary|budget|taxation|banking|trade|export|import)/i,

    // ==================== MISCELLANEOUS ====================
    
    'artificialintelligence': /\b(artificial\s+intelligence|ai\b|natural\s+language|nlp|computer\s+vision|expert\s+system|knowledge\s+base|inference)/i,
    
    'webdevelopment': /\b(web\s+development|frontend|backend|full\s+stack|website|web\s+application|responsive|api|rest|graphql)/i,
    
    'cloudcomputing': /\b(cloud\s+computing|cloud|saas|paas|iaas|virtualization|scalability|distributed\s+system)/i,
  };
  
  for (const [tech, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      detectedTechs.push(tech);
    }
  }
  
  if (detectedTechs.length > 0) {
    console.log(`   🔍 [UNIVERSITY] Detected technologies: ${detectedTechs.join(', ')}`);
  }
  
  return detectedTechs;
}

function generateSubjectKeywords(tech) {
  const baseKeywords = [tech];
  
  const expansions = {
    // Programming Languages
    'javascript': ['js', 'javascript', 'ecmascript', 'programming'],
    'typescript': ['ts', 'typescript', 'javascript'],
    'java': ['java', 'programming'],
    'python': ['python', 'programming'],
    'csharp': ['c#', 'csharp', 'dotnet', '.net'],
    'php': ['php', 'programming'],
    'ruby': ['ruby', 'programming'],
    'go': ['go', 'golang', 'programming'],
    'rust': ['rust', 'programming'],
    'kotlin': ['kotlin', 'programming'],
    'swift': ['swift', 'programming'],
     'c': ['c', 'c programming'],
    'cplusplus': ['c++', 'cpp', 'c plus plus', 'object oriented'],
    
    // Frontend
    'react': ['react', 'reactjs', 'javascript', 'frontend'],
    'angular': ['angular', 'angularjs', 'typescript', 'frontend'],
    'vue': ['vue', 'vuejs', 'javascript', 'frontend'],
    
    // Backend
    'nodejs': ['node', 'node.js', 'javascript', 'backend'],
    'express': ['express', 'node', 'backend'],
    'django': ['django', 'python', 'backend'],
    'flask': ['flask', 'python', 'backend'],
    'springboot': ['spring', 'springboot', 'java'],
    'spring': ['spring', 'java'],
    
    // Databases
    'mysql': ['mysql', 'sql', 'database'],
    'postgresql': ['postgres', 'postgresql', 'sql', 'database'],
    'mongodb': ['mongodb', 'mongo', 'nosql', 'database'],
    'redis': ['redis', 'cache', 'database'],
    'sql': ['sql', 'database'],
    'dbms': ['dbms', 'database'],
    'rdbms': ['rdbms', 'database', 'sql'],
    
    // ORM
    'hibernate': ['hibernate', 'orm', 'java'],
    'jpa': ['jpa', 'java', 'orm'],
    
    // Web Technologies
    'html': ['html', 'web', 'markup'],
    'css': ['css', 'styling', 'web'],
    'bootstrap': ['bootstrap', 'css', 'frontend'],
    
    // Cloud/DevOps
    'docker': ['docker', 'container', 'devops'],
    'kubernetes': ['kubernetes', 'k8s', 'devops'],
    'aws': ['aws', 'cloud'],
    'azure': ['azure', 'cloud'],
    'gcp': ['gcp', 'google cloud', 'cloud'],
    
    // Build Tools
    'maven': ['maven', 'java', 'build'],
    'gradle': ['gradle', 'java', 'build'],
    
    // Version Control
    'git': ['git', 'github', 'version'],
    
    // Data Science
    'machinelearning': ['machine learning', 'ml', 'ai'],
    'datascience': ['data science', 'analytics'],
    'rprogramming': ['r', 'r programming', 'statistics'],
    
    // Algorithms & Data Structures
    'algorithms': ['algorithm', 'algorithms', 'dsa'],
    'datastructure': ['data structure', 'dsa'],
    
    // Academic Subjects
    'mathematics': ['math', 'mathematics'],
    'physics': ['physics'],
    'chemistry': ['chemistry'],
    'biology': ['biology'],
    'biotechnology': ['biotechnology', 'biology'],
    
    // Engineering
    'computernetworks': ['network', 'networks', 'computer networks'],
    'operatingsystems': ['operating system', 'os'],
    'cryptography': ['cryptography', 'security'],
    'digitalforensics': ['forensics', 'security'],
    
    // Business
    'accounting': ['accounting', 'accounts'],
    'finance': ['finance', 'accounts'],
    'commerce': ['commerce', 'business'],
    'management': ['management', 'bba', 'business'],
    
    // Languages
    'english': ['english'],
    'tamil': ['tamil'],
    'french': ['french'],
    'hindi': ['hindi'],
    
    // Aptitude
    'aptitude': ['aptitude', 'reasoning'],
    'softskills': ['soft skills', 'communication'],
    
    // General Studies
    'history': ['history'],
    'geography': ['geography'],
    'polity': ['polity', 'politics'],
    'economy': ['economy', 'economics'],
    
    // Misc
    'artificialintelligence': ['ai', 'artificial intelligence'],
    'webdevelopment': ['web development', 'web'],
    'cloudcomputing': ['cloud', 'cloud computing'],
  };
  
  return expansions[tech] || baseKeywords;
}

function matchesTechnology(name, allTechKeywords) {
  if (!name || !allTechKeywords || allTechKeywords.length === 0) return false;
  
  const nameLower = name.toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Remove special chars
    .replace(/\s+/g, ' ')      // Normalize spaces
    .trim();
  
  return allTechKeywords.some(keyword => {
    const keywordLower = keyword.toLowerCase();
    
    // Exact match
    if (nameLower === keywordLower) return true;
    
    // ✅ ESCAPE SPECIAL REGEX CHARACTERS
    const escapedKeyword = keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Word boundary match (e.g., "Java" matches "Java Full Stack")
    try {
      if (new RegExp(`\\b${escapedKeyword}\\b`, 'i').test(nameLower)) return true;
    } catch (err) {
      // If regex still fails, skip this keyword
      console.warn(`   ⚠️ [UNIVERSITY] Regex error for keyword "${keyword}":`, err.message);
    }
    
    // Partial match for compound words (e.g., "springboot" matches "Spring Boot")
    if (nameLower.replace(/\s+/g, '') === keywordLower.replace(/\s+/g, '')) return true;
    
    return false;
  });
}

export async function classifyQuestionUniversity(questionText, token) {
  const key = tokenKey(token);
  
  const collections = {
    subjects: `subjects_${key}`,
    topics: `topics_${key}`,
    subtopics: `subtopics_${key}`
  };

  try {
    console.log(`🔍 [UNIVERSITY] Classifying: "${questionText.substring(0, 80)}..."`);
    
    // ✅ ADD THESE LINES (NEW)
    const cleanedText = questionText
      .replace(/\$\$\$examly/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`   🧹 [UNIVERSITY] Cleaned: "${cleanedText.substring(0, 100)}..."`);
    
    const detectedTechs = detectTechnologies(cleanedText);  // ✅ USE cleanedText
    
    // ✅ ADD THIS (NEW)
    if (detectedTechs.includes('cplusplus') && detectedTechs.includes('c')) {
      const cIndex = detectedTechs.indexOf('c');
      detectedTechs.splice(cIndex, 1);
      console.log(`   🔧 [UNIVERSITY] Removed 'c' because 'cplusplus' was detected`);
    }
    
    const allKeywords = [];
    detectedTechs.forEach(tech => {
      const keywords = generateSubjectKeywords(tech);
      allKeywords.push(...keywords);
    });
    
    const uniqueKeywords = [...new Set(allKeywords)];
    
    const questionVector = await embedOne(cleanedText);

    const [subjectResults, topicResults, subtopicResults] = await Promise.all([
      qdrant.search(collections.subjects, {
        vector: questionVector,
        limit: 8,
        with_payload: true
      }),
      qdrant.search(collections.topics, {
        vector: questionVector,
        limit: 10,
        with_payload: true
      }),
      qdrant.search(collections.subtopics, {
        vector: questionVector,
        limit: 15,
        with_payload: true
      })
    ]);

    // ✅ BOOST MATCHING RESULTS (same logic as corporate)
    if (uniqueKeywords.length > 0) {
      console.log(`   🎯 [UNIVERSITY] Matching against keywords: ${uniqueKeywords.slice(0, 5).join(', ')}`);
      
      subjectResults.forEach(result => {
        if (matchesTechnology(result.payload.name, uniqueKeywords)) {
          const oldScore = result.score;
          result.score = Math.min(1.0, result.score * 2.0);
          console.log(`   ✨ [UNIVERSITY] Boosted subject "${result.payload.name}": ${(oldScore*100).toFixed(0)}% → ${(result.score*100).toFixed(0)}%`);
        }
      });
      
      topicResults.forEach(result => {
        if (matchesTechnology(result.payload.topic_name, uniqueKeywords) || 
            matchesTechnology(result.payload.subject_name, uniqueKeywords)) {
          result.score = Math.min(1.0, result.score * 2.0);
        }
      });
      
      subtopicResults.forEach(result => {
        if (matchesTechnology(result.payload.topic_name, uniqueKeywords) || 
            matchesTechnology(result.payload.subject_name, uniqueKeywords)) {
          result.score = Math.min(1.0, result.score * 2.0);
        }
      });
      
      subjectResults.sort((a, b) => b.score - a.score);
      topicResults.sort((a, b) => b.score - a.score);
      subtopicResults.sort((a, b) => b.score - a.score);
    }

    const topSubject = subjectResults[0];
    const topTopic = topicResults[0];
    const topSubtopic = subtopicResults[0];

    const subjectScore = topSubject.score * 100;
    const topicScore = topTopic.score * 100;
    const subtopicScore = topSubtopic.score * 100;

    console.log(`   📊 [UNIVERSITY] Top matches:`);
    console.log(`      Subject: ${topSubject.payload.name} (${Math.round(subjectScore)}%)`);
    console.log(`      Topic: ${topTopic.payload.topic_name} (${Math.round(topicScore)}%)`);
    console.log(`      Subtopic: ${topSubtopic.payload.subtopic_name} (${Math.round(subtopicScore)}%)`);

    // ✅ SMART SELECTION STRATEGY (same as corporate)
    let finalResult;
    let strategy;

    if (subtopicScore >= 60 && topSubtopic.payload.topic_id === topTopic.payload.topic_id) {
      finalResult = topSubtopic.payload;
      strategy = "direct_match";
    } else if (topicScore >= 50) {
      const filteredSubtopics = await qdrant.search(collections.subtopics, {
        vector: questionVector,
        limit: 1,
        filter: {
          must: [{ key: "topic_id", match: { value: topTopic.payload.topic_id } }]
        },
        with_payload: true
      });
      finalResult = filteredSubtopics.length > 0 ? filteredSubtopics[0].payload : topSubtopic.payload;
      strategy = "topic_filtered";
    } else if (subjectScore >= 40) {
      const filteredTopics = await qdrant.search(collections.topics, {
        vector: questionVector,
        limit: 1,
        filter: {
          must: [{ key: "subject_id", match: { value: topSubject.payload.subject_id } }]
        },
        with_payload: true
      });

      if (filteredTopics.length > 0) {
        const filteredSubtopics = await qdrant.search(collections.subtopics, {
          vector: questionVector,
          limit: 1,
          filter: {
            must: [{ key: "topic_id", match: { value: filteredTopics[0].payload.topic_id } }]
          },
          with_payload: true
        });
        finalResult = filteredSubtopics.length > 0 ? filteredSubtopics[0].payload : topSubtopic.payload;
        strategy = "subject_chain";
      } else {
        finalResult = topSubtopic.payload;
        strategy = "fallback";
      }
    } else {
      finalResult = topSubtopic.payload;
      strategy = "best_match";
    }

    let confidence;
    if (strategy === "direct_match") {
      confidence = Math.round(subtopicScore);
    } else if (strategy === "topic_filtered") {
      confidence = Math.round((topicScore + subtopicScore) / 2);
    } else if (strategy === "subject_chain") {
      confidence = Math.round((subjectScore + topicScore + subtopicScore) / 3);
    } else {
      confidence = Math.round(subtopicScore);
    }

    if (uniqueKeywords.length > 0) {
      const matches = matchesTechnology(finalResult.topic_name, uniqueKeywords) ||
                     matchesTechnology(finalResult.subject_name, uniqueKeywords);
      
      if (matches) {
        confidence = Math.min(100, confidence + 20);
        console.log(`   🎯 [UNIVERSITY] Tech match bonus: +20% → ${confidence}%`);
      }
    }

    console.log(`   ✅ [UNIVERSITY] ${strategy} → ${finalResult.subject_name} / ${finalResult.topic_name} / ${finalResult.subtopic_name} (${confidence}%)`);

    return {
      suggested_subject_id: finalResult.subject_id,
      suggested_topic_id: finalResult.topic_id,
      suggested_sub_topic_id: finalResult.subtopic_id,
      suggested_subject_name: finalResult.subject_name,
      suggested_topic_name: finalResult.topic_name,
      suggested_sub_topic_name: finalResult.subtopic_name,
      confidence: confidence,
      reasoning: `${detectedTechs.length > 0 ? detectedTechs.slice(0, 2).join('+') + ' → ' : ''}${finalResult.topic_name} → ${finalResult.subtopic_name}`
    };

  } catch (err) {
    console.error("❌ [UNIVERSITY] Classification error:", err);
    throw err;
  }
}