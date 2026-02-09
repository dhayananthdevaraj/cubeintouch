

import { qdrant } from "./vectorDB.js";
import { embedOne } from "./embedding.js";

function tokenKey(token) {
  return "prod_v1";
}

// ✅ COMPREHENSIVE TECHNOLOGY DETECTION (Auto-expands)
function detectTechnologies(questionText) {
  const text = questionText.toLowerCase();
  const detectedTechs = [];
  
const patterns = {

  'javascript': /\b(javascript|js\b|ecmascript|console\.log|console\.error|let\s|const\s|var\s|=>|arrow\s+function|function\s*\(|\.js\b|node|npm|yarn|typeof|instanceof|promise|async|await|callback|closure|prototype|this\.)/i,
  
  'typescript': /\b(typescript|ts\b|interface\s|type\s|enum\s|\.ts\b|\.tsx\b|generic|implements|extends|namespace|module|decorator|@types|tsc\b|tsconfig)/i,
  
  'java': /\b(java\b|public\s+class|public\s+static|private\s+class|protected\s+class|System\.out|import\s+java\.|\.java\b|extends\s+|implements\s+|package\s+|abstract\s+class|interface\s+\w+|synchronized|volatile|transient|serializable|jvm|jdk|maven|gradle)/i,
  
  'python': /\b(python|def\s|import\s|from\s+\w+\s+import|print\s*\(|if\s+__name__|\.py\b|pip\s+install|virtual\s*env|requirements\.txt|lambda\s+|list\s+comprehension|dictionary|tuple|self\.|__init__|class\s+\w+:|django|flask|pandas|numpy)/i,
  
  'csharp': /\b(c#|csharp|using\s+System|namespace\s|Console\.WriteLine|\.cs\b|var\s+\w+\s*=|async\s+Task|await\s+|linq|entity\s+framework|\.net|public\s+void|private\s+void|interface\s+I\w+|delegate|event\s+)/i,
  
  'php': /\b(php|<\?php|\$\w+\s*=|echo\s|print\s|\.php\b|mysqli|pdo|composer|laravel|symfony|wordpress|function\s+\w+\s*\(|class\s+\w+|namespace\s+|use\s+)/i,
  
  'ruby': /\b(ruby|def\s|end\b|\.rb\b|puts\s|print\s|require\s+|gem\s+|rails|rake|bundle|class\s+\w+|module\s+|attr_accessor|@\w+\s*=)/i,
  
  'go': /\b(golang?|go\b|package\s+main|func\s|import\s+|\.go\b|goroutine|channel|defer\s+|interface\{\}|struct\s+|make\(|var\s+\w+\s+|:=\s+)/i,
  
  'rust': /\b(rust|fn\s|let\s+mut|let\s+|cargo|\.rs\b|impl\s+|trait\s+|struct\s+|enum\s+|match\s+|ownership|borrow|lifetime|unsafe|pub\s+)/i,
  
  'kotlin': /\b(kotlin|fun\s|val\s|var\s|\.kt\b|data\s+class|sealed\s+class|companion\s+object|coroutine|suspend\s+fun|when\s*\{|lateinit|by\s+lazy)/i,
  
  'swift': /\b(swift|func\s|let\s|var\s|\.swift\b|protocol\s+|extension\s+|struct\s+|class\s+|enum\s+|guard\s+|defer\s+|optional|unwrap|\?\?|\.self)/i,

  // ==================== FRONTEND FRAMEWORKS ====================
  
  'react': /\b(react|reactjs|useState|useEffect|useContext|useReducer|useMemo|useCallback|useRef|jsx|tsx|props\b|component|render|virtual\s+dom|react\s+hook|functional\s+component|class\s+component|defaultValue|controlled\s+component|uncontrolled|react\s+form|react\s+app|create-react-app|next\.?js|gatsby|react\s+native|redux|context\s+api|prop\s+drilling)/i,
  
  'angular': /\b(angular|angularjs|@Component|@Injectable|@Input|@Output|@Directive|@Pipe|ng\b|ngOnInit|ngOnDestroy|ngOnChanges|\.component\.ts|\.service\.ts|\.module\.ts|dependency\s+injection|observable|rxjs|template|two-way\s+binding|data\s+binding|angular\s+cli|ng\s+serve|zone\.js)/i,
  
  'vue': /\b(vue|vuejs|vue\.js|v-if|v-else|v-for|v-bind|v-model|v-on|<template>|<script\s+setup>|computed|watch|methods|data\(\)|props|emit|slot|scoped|composition\s+api|options\s+api|nuxt|pinia|vuex|vue\s+router)/i,
  
  'svelte': /\b(svelte|sveltekit|<script>|<style>|\.svelte|\$:|reactive|store|writable|readable|derived|on:click|bind:|class:|transition:|animate:)/i,

  // ==================== BACKEND FRAMEWORKS ====================
  
  'nodejs': /\b(node|nodejs|node\.js|require\s*\(|module\.exports|export\s+default|import\s+.*\s+from|npm\b|npx|yarn|package\.json|process\.env|process\.argv|__dirname|__filename|fs\.read|fs\.write|fs\.create|path\.join|buffer|stream|event\s+loop|callback|middleware|express|koa|nestjs)/i,
  
  'express': /\b(express|app\.get|app\.post|app\.put|app\.delete|app\.use|router\.|req\.|res\.|next\(|middleware|express\s*\(\)|body-parser|cookie-parser|cors|helmet|morgan|express\s+router)/i,
  
  'nestjs': /\b(nestjs|nest\s+js|@Module|@Controller|@Injectable|@Get|@Post|@Put|@Delete|@Param|@Body|@Query|provider|guard|interceptor|pipe|decorator|dependency\s+injection)/i,
  
  'django': /\b(django|from\s+django|models\.Model|views\.py|urls\.py|settings\.py|manage\.py|orm|queryset|migration|template|forms\.Form|serializer|rest\s+framework|drf|wsgi|middleware)/i,
  
  'flask': /\b(flask|from\s+flask|@app\.route|@app\.before_request|render_template|jsonify|request\.|session\.|blueprints|jinja2|werkzeug|flask-sqlalchemy)/i,
  
  'springboot': /\b(spring\s+boot|springboot|@SpringBootApplication|@RestController|@Controller|@Service|@Repository|@Component|@Autowired|@RequestMapping|@GetMapping|@PostMapping|@PathVariable|@RequestBody|application\.properties|application\.yml|spring\s+initializer|starter|auto\s*configuration)/i,
  
  'spring': /\b(spring|springframework|@Component|@Service|@Repository|@Configuration|@Bean|@Qualifier|dependency\s+injection|inversion\s+of\s+control|ioc|aop|aspect|transaction|spring\s+framework|spring\s+mvc|spring\s+data|spring\s+security)/i,

  // ==================== DATABASES ====================
  
  'mysql': /\b(mysql|my\s+sql|mysql\s+database|mysql\s+server|mysql\s+workbench|SHOW\s+TABLES|SHOW\s+DATABASES|DESCRIBE\s+|mysqldump|mysql_connect|innodb|myisam|phpmyadmin|mariadb)/i,
  
  'postgresql': /\b(postgres|postgresql|psql|pg_dump|pg_restore|pgadmin|postgis|serial|bigserial|jsonb|array\s+type|postgres\s+database)/i,
  
  'mongodb': /\b(mongodb|mongo\s+db|mongo|mongoose|db\.collection|findOne|findMany|insertOne|updateOne|deleteOne|aggregate|lookup|unwind|nosql|bson|document\s+database|atlas)/i,
  
  'redis': /\b(redis|HSET|HGET|LPUSH|RPUSH|LPOP|SADD|ZADD|redis-cli|redis\s+cache|key-value\s+store|in-memory|pub\/sub)/i,
  
  'sql': /\b(SELECT\s+[\w*,\s]+\s+FROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|TRUNCATE|JOIN\s+|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|WHERE\s+|GROUP\s+BY|ORDER\s+BY|HAVING\s+|INDEX|PRIMARY\s+KEY|FOREIGN\s+KEY|sql\s+query|sql\s+database|sql\s+statement|relational\s+database|rdbms)/i,

  // ==================== ORM / DATABASE TOOLS ====================
  
  'hibernate': /\b(hibernate|@Entity|@Table|@Column|@Id|@GeneratedValue|@OneToMany|@ManyToOne|@ManyToMany|@JoinColumn|SessionFactory|session\.save|session\.get|hql|jpql|criteria\s+api|lazy\s+loading|eager\s+loading|cascade|fetch|hibernate\.cfg)/i,
  
  'jpa': /\b(jpa|java\s+persistence\s+api|EntityManager|@PersistenceContext|@Entity|@Repository|persist\(|merge\(|find\(|query|named\s+query|criteria\s+builder)/i,
  
  'sequelize': /\b(sequelize|sequelize\.define|model\.findAll|model\.findOne|model\.create|model\.update|model\.destroy|associations|hasMany|belongsTo|migration|seed)/i,

  // ==================== WEB TECHNOLOGIES ====================
  
  'html': /\b(html|html5|markup|<html|<head|<body|<div|<span|<p>|<h[1-6]>|<table|<tr>|<td>|<th>|<input|<form|<button|<a\s+href|<img\s+src|<link|<script|<style|semantic\s+html|dom|document|element|tag|attribute|input\s+field|text\s+field|form\s+element)/i,
  
  'css': /\b(css|css3|stylesheet|cascading\s+style|style\s+sheet|margin\s*:|padding\s*:|color\s*:|background\s*:|display\s*:|position\s*:|flex\b|flexbox|grid\b|css\s+grid|float\s*:|z-index|transform|transition|animation|@media|@keyframes|pseudo-class|pseudo-element|selector|box\s+model|responsive|\.css\b)/i,
  
  'sass': /\b(sass|scss|\.scss|\.sass|@import|@mixin|@include|@extend|@function|nesting|variable\s+\$|interpolation|partials|preprocessing)/i,
  
  'bootstrap': /\b(bootstrap|bootstrap\s+[345]|container|container-fluid|row|col-|col-xs|col-sm|col-md|col-lg|col-xl|btn\s+btn-|navbar|card|modal|alert|badge|responsive\s+grid)/i,
  
  'tailwind': /\b(tailwind|tailwindcss|utility-first|@apply|@layer|@tailwind|prose|container|mx-auto|flex|grid|bg-|text-|p-|m-|w-|h-|hover:|focus:|responsive)/i,

  // ==================== HTTP / API ====================
  
  'axios': /\b(axios|axios\.get|axios\.post|axios\.put|axios\.delete|axios\.patch|axios\s*\(|axios\.create|baseURL|interceptor|request\s+config|response\s+data|axios\s+instance)/i,
  
  'fetch': /\b(fetch\s*\(|fetch\s+api|\.then\s*\(|\.catch\s*\(|\.json\s*\(\)|response\.ok|response\.status|Request\s+object|Response\s+object|headers\s+object)/i,
  
  'rest': /\b(rest|rest\s+api|restful|@GetMapping|@PostMapping|@PutMapping|@DeleteMapping|@PatchMapping|http\s+method|get\s+request|post\s+request|put\s+request|delete\s+request|endpoint|resource|stateless|crud|json\s+response)/i,
  
  'graphql': /\b(graphql|graph\s+ql|query\s+|mutation\s+|subscription\s+|type\s+Query|type\s+Mutation|resolver|schema|field|fragment|apollo|relay)/i,

  // ==================== CLOUD / DEVOPS ====================
  
  'docker': /\b(docker|dockerfile|docker-compose|docker\.yml|container|image|volume|network|docker\s+build|docker\s+run|docker\s+push|docker\s+pull|docker\s+hub|containerization|orchestration)/i,
  
  'kubernetes': /\b(kubernetes|k8s|kubectl|pod|deployment|service|ingress|configmap|secret|namespace|helm|minikube|cluster|node|replica|statefulset|daemonset|deployment\.yaml|kube-proxy)/i,
  
  'aws': /\b(aws|amazon\s+web\s+services|ec2|s3|lambda|rds|dynamodb|elasticache|cloudfront|route\s+53|vpc|iam|cloudwatch|elastic\s+beanstalk|ecs|eks|api\s+gateway)/i,
  
  'azure': /\b(azure|microsoft\s+azure|az\b|azure\s+portal|app\s+service|azure\s+functions|blob\s+storage|cosmos\s+db|azure\s+sql|virtual\s+machine|azure\s+devops)/i,
  
  'gcp': /\b(gcp|google\s+cloud|google\s+cloud\s+platform|compute\s+engine|app\s+engine|cloud\s+storage|cloud\s+sql|bigquery|firebase|cloud\s+functions|kubernetes\s+engine|gke)/i,

  // ==================== BUILD TOOLS ====================
  
  'webpack': /\b(webpack|webpack\.config|webpack\.config\.js|bundle|loader|plugin|entry\s+point|output|module\.rules|babel-loader|css-loader|file-loader|html-webpack-plugin)/i,
  
  'vite': /\b(vite|vite\.config|vitejs|vite\s+build|vite\s+dev|hmr|hot\s+module\s+replacement|esbuild|rollup)/i,
  
  'maven': /\b(maven|pom\.xml|mvn\s+|mvn\s+clean|mvn\s+install|mvn\s+package|<dependency>|<dependencies>|<plugin>|maven\s+central|artifactId|groupId)/i,
  
  'gradle': /\b(gradle|build\.gradle|gradle\.properties|gradlew|gradle\s+build|gradle\s+task|dependencies\s*\{|implementation|compileOnly|testImplementation)/i,
  
  'npm': /\b(npm|npm\s+install|npm\s+start|npm\s+run|npm\s+test|package\.json|package-lock\.json|node_modules|devDependencies|dependencies|scripts|npm\s+ci)/i,
  
  'yarn': /\b(yarn|yarn\s+add|yarn\s+install|yarn\s+start|yarn\s+build|yarn\.lock|yarn\s+workspace|monorepo)/i,

  // ==================== TESTING ====================
  
  'jest': /\b(jest|describe\s*\(|it\s*\(|test\s*\(|expect\s*\(|toBe|toEqual|toMatch|mock|spy|snapshot|coverage|jest\.config)/i,
  
  'junit': /\b(junit|@Test|@Before|@After|@BeforeEach|@AfterEach|@BeforeAll|@AfterAll|assertEquals|assertTrue|assertFalse|assertNull|assertThrows|test\s+case|test\s+suite)/i,
  
  'selenium': /\b(selenium|webdriver|selenium\s+webdriver|driver\.get|driver\.find_element|driver\.click|driver\.send_keys|By\.id|By\.xpath|By\.css_selector|automation|test\s+automation|browser\s+automation)/i,

  // ==================== VERSION CONTROL ====================
  
  'git': /\b(git|git\s+init|git\s+clone|git\s+add|git\s+commit|git\s+push|git\s+pull|git\s+fetch|git\s+merge|git\s+rebase|git\s+branch|git\s+checkout|git\s+tag|git\s+status|git\s+log|github|gitlab|bitbucket|version\s+control|repository|remote)/i,

  // ==================== BIG DATA ====================
  
  'spark': /\b(spark|apache\s+spark|rdd|resilient\s+distributed\s+dataset|dataframe|dataset|spark\s+sql|pyspark|spark\s+streaming|mllib|graphx|cluster\s+computing)/i,
  
  'hadoop': /\b(hadoop|apache\s+hadoop|mapreduce|hdfs|hadoop\s+distributed\s+file\s+system|yarn|hive|pig|hbase|distributed\s+computing)/i,
  
  'kafka': /\b(kafka|apache\s+kafka|producer|consumer|topic|partition|broker|zookeeper|stream|event\s+streaming|message\s+queue|pub\/sub)/i,

  // ==================== .NET ====================
  
  'dotnet': /\b(\.net|dotnet|dot\s+net|using\s+System|namespace\s|System\.Collections|System\.Linq|ASP\.NET|\.NET\s+Core|\.NET\s+Framework|IActionResult|nuget|msbuild|visual\s+studio)/i,
  
  'aspnet': /\b(asp\.net|aspnet|asp\.net\s+core|asp\.net\s+mvc|razor|blazor|web\s+api|Startup\.cs|Program\.cs|appsettings\.json|middleware|controller|action|model|view)/i,
};
  
  for (const [tech, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      detectedTechs.push(tech);
    }
  }
  
  if (detectedTechs.length > 0) {
    console.log(`   🔍 Detected technologies: ${detectedTechs.join(', ')}`);
  }
  
  return detectedTechs;
}

// ✅ DYNAMIC KEYWORD GENERATION (Maps tech to potential subject keywords)
function generateSubjectKeywords(tech) {
  const baseKeywords = [tech];
  
  // Add common variations and related terms
  const expansions = {
    'javascript': ['js', 'javascript', 'ecmascript', 'programming'],
    'typescript': ['ts', 'typescript', 'javascript'],
    'nodejs': ['node', 'node.js', 'javascript', 'backend'],
    'react': ['react', 'reactjs', 'javascript', 'frontend'],
    'angular': ['angular', 'angularjs', 'typescript', 'frontend'],
    'vue': ['vue', 'vuejs', 'javascript', 'frontend'],
    'java': ['java', 'programming'],
    'python': ['python', 'programming'],
    'csharp': ['c#', 'csharp', 'dotnet', '.net'],
    'springboot': ['spring', 'springboot', 'java'],
    'spring': ['spring', 'java'],
    'hibernate': ['hibernate', 'orm', 'java'],
    'mysql': ['mysql', 'sql', 'database'],
    'sql': ['sql', 'database'],
    'html': ['html', 'web', 'markup'],
    'css': ['css', 'styling', 'web'],
    'git': ['git', 'github', 'version'],
    'docker': ['docker', 'container', 'devops'],
    'aws': ['aws', 'cloud'],
    'dotnet': ['dotnet', '.net', 'asp.net', 'c#'],
    'aspnet': ['asp.net', '.net', 'dotnet'],
  };
  
  return expansions[tech] || baseKeywords;
}

// ✅ FLEXIBLE MATCHING (handles variations)
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
    
    // Word boundary match (e.g., "Java" matches "Java Full Stack")
    if (new RegExp(`\\b${keywordLower}\\b`, 'i').test(nameLower)) return true;
    
    // Partial match for compound words (e.g., "springboot" matches "Spring Boot")
    if (nameLower.replace(/\s+/g, '') === keywordLower.replace(/\s+/g, '')) return true;
    
    return false;
  });
}

export async function classifyQuestion(questionText, token) {
  
  const key = tokenKey(token);
  
  const collections = {
    subjects: `subjects_${key}`,
    topics: `topics_${key}`,
    subtopics: `subtopics_${key}`
  };

  try {
    console.log(`🔍 Classifying: "${questionText.substring(0, 80)}..."`);
    
    // ✅ DETECT ALL TECHNOLOGIES
    const detectedTechs = detectTechnologies(questionText);
    
    // ✅ GENERATE ALL POSSIBLE KEYWORDS
    const allKeywords = [];
    detectedTechs.forEach(tech => {
      const keywords = generateSubjectKeywords(tech);
      allKeywords.push(...keywords);
    });
    
    // Remove duplicates
    const uniqueKeywords = [...new Set(allKeywords)];
    
    const questionVector = await embedOne(questionText);

    // ✅ SEARCH ALL THREE LEVELS
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

    // ✅ BOOST MATCHING RESULTS
    if (uniqueKeywords.length > 0) {
      console.log(`   🎯 Matching against keywords: ${uniqueKeywords.slice(0, 5).join(', ')}${uniqueKeywords.length > 5 ? '...' : ''}`);
      
      let boostedCount = 0;
      
      // Boost subjects
      subjectResults.forEach(result => {
        if (matchesTechnology(result.payload.name, uniqueKeywords)) {
          const oldScore = result.score;
          result.score = Math.min(1.0, result.score * 2.0);  // 100% boost
          console.log(`   ✨ Boosted subject "${result.payload.name}": ${(oldScore*100).toFixed(0)}% → ${(result.score*100).toFixed(0)}%`);
          boostedCount++;
        }
      });
      
      // Boost topics
      topicResults.forEach(result => {
        const topicMatch = matchesTechnology(result.payload.topic_name, uniqueKeywords);
        const subjectMatch = matchesTechnology(result.payload.subject_name, uniqueKeywords);
        
        if (topicMatch || subjectMatch) {
          const oldScore = result.score;
          result.score = Math.min(1.0, result.score * 2.0);
          console.log(`   ✨ Boosted topic "${result.payload.topic_name}": ${(oldScore*100).toFixed(0)}% → ${(result.score*100).toFixed(0)}%`);
          boostedCount++;
        }
      });
      
      // Boost subtopics
      subtopicResults.forEach(result => {
        const topicMatch = matchesTechnology(result.payload.topic_name, uniqueKeywords);
        const subjectMatch = matchesTechnology(result.payload.subject_name, uniqueKeywords);
        
        if (topicMatch || subjectMatch) {
          const oldScore = result.score;
          result.score = Math.min(1.0, result.score * 2.0);
          boostedCount++;
        }
      });
      
      console.log(`   📈 Total boosted: ${boostedCount} items`);
      
      // Re-sort
      subjectResults.sort((a, b) => b.score - a.score);
      topicResults.sort((a, b) => b.score - a.score);
      subtopicResults.sort((a, b) => b.score - a.score);
    }

    // ✅ Get top matches
    const topSubject = subjectResults[0];
    const topTopic = topicResults[0];
    const topSubtopic = subtopicResults[0];

    const subjectScore = topSubject.score * 100;
    const topicScore = topTopic.score * 100;
    const subtopicScore = topSubtopic.score * 100;

    console.log(`   📊 Top matches:`);
    console.log(`      Subject: ${topSubject.payload.name} (${Math.round(subjectScore)}%)`);
    console.log(`      Topic: ${topTopic.payload.topic_name} (${Math.round(topicScore)}%)`);
    console.log(`      Subtopic: ${topSubtopic.payload.subtopic_name} (${Math.round(subtopicScore)}%)`);

    // ✅ SMART SELECTION STRATEGY
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

    // ✅ CALCULATE CONFIDENCE
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

    // ✅ TECHNOLOGY MATCH BONUS
    if (uniqueKeywords.length > 0) {
      const matches = matchesTechnology(finalResult.topic_name, uniqueKeywords) ||
                     matchesTechnology(finalResult.subject_name, uniqueKeywords);
      
      if (matches) {
        confidence = Math.min(100, confidence + 20);
        console.log(`   🎯 Tech match bonus: +20% → ${confidence}%`);
      }
    }

    console.log(`   ✅ ${strategy} → ${finalResult.subject_name} / ${finalResult.topic_name} / ${finalResult.subtopic_name} (${confidence}%)`);

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
    console.error("❌ Classification error:", err);
    throw err;
  }
}