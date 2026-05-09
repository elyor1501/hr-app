from __future__ import annotations
import re

# Manually-maintained skill vocabulary across all engineering domains.
# Volume-mounted — add a skill here, restart the service, it takes effect immediately.
# Normalised lookup key: lowercase, strip non-alphanumeric (except spaces).
CUSTOM_SKILLS: frozenset[str] = frozenset({
    # ── SAP Core ──────────────────────────────────────────────────────────────
    "ABAP", "ABAP OO", "BAPI", "RFC", "BAdI", "BTE", "IDoc", "ALE",
    "AMDP", "CDS Views", "CDS", "DDIC", "SE38", "SE80",
    "AIF", "BTP", "SAP BTP", "SAP Cloud Platform",
    "SAP Fiori", "Fiori Elements", "Neptune DXP",
    "BOPF", "LSMW", "SmartForms", "SAPScript", "Adobe Forms",
    "SAP PI", "SAP PO", "SAP CPI", "SAP Integration Suite",
    "S/4 HANA", "S/4HANA", "ECC", "ECC 6.0",
    "BW/4HANA", "BW", "SAP BW", "SAP BI", "SAP HANA",
    "SAP RAP", "SAP CAP", "WebDynpro", "Web Dynpro",
    "SAPUI5", "OpenUI5", "SAP Gateway",
    "SAP MM", "SAP SD", "SAP FI", "SAP CO", "SAP PP", "SAP QM",
    "SAP PM", "SAP WM", "SAP EWM", "SAP TM", "SAP HR", "SAP HCM",
    "SAP SuccessFactors", "SAP Ariba", "SAP Concur", "SAP SRM",
    "SAP CRM", "SAP Hybris", "SAP Commerce", "SAP MDG", "SAP MDM",
    "SAP Solution Manager", "SAP CHARM", "SAP Activate",
    "RICEF", "RICEFW", "BODS", "SAP BODS",
    # ── Java Ecosystem ────────────────────────────────────────────────────────
    "Java", "Java EE", "Jakarta EE", "Spring", "Spring Boot", "Spring MVC",
    "Spring Security", "Spring Data", "Spring Cloud", "Spring Batch",
    "Hibernate", "JPA", "JNDI", "EJB", "JSF", "JSP", "Servlets",
    "Maven", "Gradle", "Ant", "JUnit", "Mockito", "TestNG",
    "JAX-RS", "JAX-WS", "JAXB", "Apache Camel", "Apache CXF",
    "Quarkus", "Micronaut", "Dropwizard",
    "JVM", "GraalVM", "OpenJDK", "JDK",
    # ── Python Ecosystem ──────────────────────────────────────────────────────
    "Python", "Django", "FastAPI", "Flask", "Celery", "Pydantic",
    "SQLAlchemy", "Alembic", "Pytest", "Pandas", "NumPy", "SciPy",
    "Scikit-learn", "TensorFlow", "PyTorch", "Keras", "XGBoost",
    "Hugging Face", "LangChain", "LlamaIndex",
    "Asyncio", "Uvicorn", "Gunicorn",
    # ── JavaScript / TypeScript ───────────────────────────────────────────────
    "JavaScript", "TypeScript", "Node.js", "Express", "NestJS",
    "React", "Next.js", "Vue.js", "Nuxt.js", "Angular", "Svelte",
    "Redux", "Zustand", "MobX", "GraphQL", "Apollo",
    "Webpack", "Vite", "Rollup", "Babel", "ESLint", "Prettier",
    "Jest", "Cypress", "Playwright", "Vitest",
    "Tailwind CSS", "Material UI", "Chakra UI", "Ant Design",
    # ── Go ────────────────────────────────────────────────────────────────────
    "Go", "Golang", "Gin", "Echo", "Fiber", "gRPC", "Gorilla Mux",
    "GORM", "testify",
    # ── C / C++ ───────────────────────────────────────────────────────────────
    "C", "C++", "Qt", "Boost", "CMake", "Makefile",
    # ── .NET Ecosystem ────────────────────────────────────────────────────────
    "C#", ".NET", ".NET Core", "ASP.NET", "ASP.NET Core", "Blazor",
    "Entity Framework", "LINQ", "WPF", "WCF", "SignalR",
    # ── Ruby / PHP / Other ───────────────────────────────────────────────────
    "Ruby", "Ruby on Rails", "PHP", "Laravel", "Symfony",
    "Scala", "Kotlin", "Swift", "Rust",
    # ── Databases ────────────────────────────────────────────────────────────
    "PostgreSQL", "MySQL", "MariaDB", "SQLite", "Oracle", "Oracle DB",
    "SQL Server", "MSSQL", "T-SQL", "PL/SQL",
    "MongoDB", "DynamoDB", "Cassandra", "Couchbase", "CouchDB",
    "Redis", "Memcached", "Elasticsearch", "OpenSearch", "Solr",
    "Neo4j", "InfluxDB", "TimescaleDB",
    "Supabase", "Firebase", "PlanetScale", "Neon",
    # ── Cloud Platforms ───────────────────────────────────────────────────────
    "AWS", "Azure", "GCP", "Google Cloud",
    "EC2", "S3", "RDS", "Lambda", "AWS Lambda", "ECS", "EKS",
    "CloudFormation", "CDK", "SAM", "API Gateway",
    "Azure Functions", "Azure DevOps", "AKS", "ACR",
    "Cloud Run", "Cloud Functions", "GKE", "BigQuery",
    "IAM", "VPC", "CloudWatch", "CloudTrail",
    # ── DevOps / Infrastructure ───────────────────────────────────────────────
    "Docker", "Kubernetes", "Helm", "Kustomize",
    "Terraform", "Pulumi", "Ansible", "Chef", "Puppet",
    "Jenkins", "GitHub Actions", "GitLab CI", "CircleCI",
    "ArgoCD", "Flux", "Spinnaker",
    "Prometheus", "Grafana", "Datadog", "New Relic", "Splunk",
    "Nginx", "HAProxy", "Traefik", "Istio", "Envoy",
    "Linux", "Ubuntu", "CentOS", "RHEL", "Debian",
    "Bash", "Shell Scripting", "PowerShell",
    # ── Data / Analytics ──────────────────────────────────────────────────────
    "Apache Kafka", "Kafka", "Apache Spark", "Spark", "Apache Flink",
    "Airflow", "Apache Airflow", "Prefect", "Dagster",
    "dbt", "Fivetran", "Airbyte", "Stitch",
    "Tableau", "Power BI", "Looker", "Metabase", "Superset",
    "Snowflake", "Databricks", "Delta Lake", "Apache Iceberg",
    "Hadoop", "HDFS", "Hive", "Presto", "Trino",
    "ETL", "ELT", "Data Warehouse", "Data Lake", "Data Lakehouse",
    # ── Messaging / Integration ───────────────────────────────────────────────
    "RabbitMQ", "ActiveMQ", "NATS", "Apache Pulsar",
    "REST", "RESTful", "SOAP", "gRPC", "WebSocket",
    "OpenAPI", "Swagger", "Postman",
    # ── Security ─────────────────────────────────────────────────────────────
    "OAuth2", "OAuth", "JWT", "SAML", "SSO", "LDAP",
    "Keycloak", "Okta", "Auth0",
    "OWASP", "Penetration Testing", "SAST", "DAST",
    # ── Testing / QA ─────────────────────────────────────────────────────────
    "Selenium", "Appium", "Robot Framework", "Karate",
    "JMeter", "Gatling", "k6",
    "SonarQube", "OWASP ZAP",
    # ── Version Control / Collaboration ──────────────────────────────────────
    "Git", "GitHub", "GitLab", "Bitbucket", "SVN",
    "Jira", "Confluence", "Trello",
    # ── Methodologies ────────────────────────────────────────────────────────
    "Agile", "Scrum", "Kanban", "SAFe", "DevOps", "GitOps",
    "TDD", "BDD", "DDD", "SOLID", "Clean Architecture",
    "Microservices", "Monolith", "Serverless", "Event-Driven",
    "CI/CD", "SRE", "Platform Engineering",
    # ── ML / AI ───────────────────────────────────────────────────────────────
    "Machine Learning", "Deep Learning", "NLP", "Computer Vision",
    "RAG", "LLM", "Fine-tuning", "Embeddings",
    "OpenAI", "Gemini", "Claude", "GPT-4",
    "MLflow", "Weights & Biases", "BentoML", "Triton",
    "spaCy", "NLTK", "Transformers", "BERT", "sentence-transformers",
    "BGE", "FAISS", "Pinecone", "Weaviate", "Qdrant", "Chroma",
})

# Normalised lookup: lowercase, strip non-alphanumeric except spaces.
# Used for case-insensitive, punctuation-tolerant matching.
CUSTOM_SKILLS_LOOKUP: dict[str, str] = {
    re.sub(r"[^a-z0-9\s]", "", s.lower().strip()): s
    for s in CUSTOM_SKILLS
}
