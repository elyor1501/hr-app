from __future__ import annotations
import re
import csv
import logging
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

@dataclass
class EscoMatch:
    value: str
    confidence: float = 0.70
    source: str = "esco"


# Curated vocabulary covering the actual CV domains in production:
# SAP, DevSecOps, Cybersecurity, Golang, Java, Data Science, IT Architecture
_BUILTIN_SKILLS: list[str] = [
    # ── SAP Core ──────────────────────────────────────────────────────────────
    "SAP", "ABAP", "SAP ABAP", "SAP HANA", "S/4 HANA", "SAP S/4 HANA",
    "SAP ECC", "SAP R/3", "SAP BTP", "SAP Fiori", "SAP UI5", "SAP Basis",
    "SAP NetWeaver", "SAP Cloud Platform", "SAP Integration Suite",
    "SAP CPI", "SAP PI", "SAP PO", "SAP GRC", "SAP Solution Manager",
    # ── SAP Functional Modules ─────────────────────────────────────────────────
    "SAP FI", "SAP CO", "SAP MM", "SAP SD", "SAP HCM", "SAP HR", "SAP PM",
    "SAP QM", "SAP WM", "SAP PS", "SAP PP", "SAP CS", "SAP SRM", "SAP CRM",
    "SAP SCM", "SAP APO", "SAP TM", "SAP EWM", "SAP LE", "SAP IS-U",
    "SAP FICO", "SAP FIN", "SAP RTR", "SAP OTC", "SAP PTP",
    # ── SAP Technical ─────────────────────────────────────────────────────────
    "OData", "ODATA", "BAPI", "BAdI", "BADI", "BDC", "ALE", "IDoc", "IDocs",
    "RFC", "LSMW", "SAP Script", "SmartForms", "Adobe Forms", "Web Dynpro",
    "FPM", "BOPF", "OO ABAP", "OOABAP", "Enhancement Framework",
    "User Exits", "Screen Exits", "ALV", "ALV Reports", "Dialog Programming",
    "AMDP", "CDS", "CDS View", "CDS Views", "VDM", "RAP",
    "ABAP RESTful Application Programming", "Clean Core", "BTP",
    "ABAP on HANA", "SAP HANA Studio", "HANA Analytics",
    # ── SAP Frameworks & Tools ─────────────────────────────────────────────────
    "AIF", "AIF framework", "BRF+", "BRF Plus", "BRF+ Framework",
    "Workflow", "ABAP Workflow", "Flexi Workflow",
    "SCP", "SAP SCP", "CPI", "SAP Signavio",
    "SE80", "SE11", "SE24", "SE37", "SE38", "SM30", "SPRO",
    "RICEFW", "RICEF", "Enhancement Points",
    "HCM Renewal", "SAP SuccessFactors", "SuccessFactors",
    "SAP Analytics Cloud", "SAP BW", "SAP BI", "BW/4HANA",
    # ── Languages ─────────────────────────────────────────────────────────────
    "Python", "Java", "JavaScript", "TypeScript", "Go", "Golang",
    "C", "C++", "C#", ".NET", "Ruby", "PHP", "Swift", "Kotlin",
    "Rust", "Scala", "R", "MATLAB", "Bash", "Shell", "PowerShell",
    "SQL", "PL/SQL", "T-SQL", "NoSQL", "HQL", "SPARQL",
    "HTML", "CSS", "XML", "JSON", "YAML", "Groovy",
    # ── Frameworks & Libraries ─────────────────────────────────────────────────
    "Spring Boot", "Spring Framework", "Hibernate", "JPA",
    "Django", "Flask", "FastAPI", "Node.js", "Express.js",
    "React", "Angular", "Vue.js", "Next.js", "Nuxt.js",
    "Gin", "Echo", "gRPC", "GraphQL", "REST API", "SOAP",
    "JUnit", "Mockito", "pytest", "Selenium", "Cypress",
    "TensorFlow", "PyTorch", "Keras", "scikit-learn",
    "Pandas", "NumPy", "Matplotlib", "Seaborn", "Plotly",
    "XGBoost", "LightGBM", "CatBoost",
    "Apache Spark", "Apache Kafka", "Apache Airflow", "MLflow",
    # ── Databases ─────────────────────────────────────────────────────────────
    "PostgreSQL", "MySQL", "Oracle", "SQL Server", "SQLite",
    "MongoDB", "Cassandra", "DynamoDB", "Firestore",
    "Redis", "Elasticsearch", "OpenSearch", "Neo4j",
    "Snowflake", "BigQuery", "Redshift", "Databricks",
    "SAP HANA DB", "MaxDB",
    # ── Cloud ─────────────────────────────────────────────────────────────────
    "AWS", "Amazon Web Services", "GCP", "Google Cloud Platform",
    "Microsoft Azure", "Azure", "IBM Cloud", "Oracle Cloud",
    "AWS Lambda", "AWS EC2", "AWS S3", "AWS RDS", "AWS EKS",
    "Azure DevOps", "Azure Functions", "Azure AKS",
    "GCP GKE", "GCP Cloud Run", "Firebase",
    # ── DevOps & Infrastructure ────────────────────────────────────────────────
    "Docker", "Kubernetes", "Helm", "Terraform", "Ansible",
    "Jenkins", "GitLab CI", "GitHub Actions", "CircleCI", "ArgoCD",
    "Prometheus", "Grafana", "ELK Stack", "Datadog", "Splunk",
    "Nginx", "Apache HTTP Server", "Istio", "Envoy",
    "Linux", "Ubuntu", "CentOS", "RHEL", "Windows Server",
    "Microservices", "Service Mesh", "API Gateway",
    "Infrastructure as Code", "GitOps", "CI/CD",
    # ── DevSecOps & Security ───────────────────────────────────────────────────
    "CrowdStrike", "Falcon", "SIEM", "SOC", "IAM", "PAM", "PKI",
    "SOAR", "EDR", "XDR", "CSPM", "CNAPP",
    "Vulnerability Management", "Penetration Testing", "Threat Intelligence",
    "Zero Trust", "OAuth", "SAML", "OpenID Connect", "MFA",
    "ISO 27001", "NIST", "SOC2", "CIS Controls", "GDPR",
    "HashiCorp Vault", "CyberArk", "Okta", "SailPoint",
    "Wireshark", "Nmap", "Metasploit", "Burp Suite",
    "OWASP", "DevSecOps", "SecOps", "AppSec", "CloudSec",
    # ── Architecture & Patterns ────────────────────────────────────────────────
    "Microservices Architecture", "Event-Driven Architecture",
    "Domain-Driven Design", "CQRS", "Event Sourcing",
    "Design Patterns", "SOLID Principles", "Clean Architecture",
    "Solution Architecture", "Enterprise Architecture", "TOGAF",
    # ── Version Control & Collaboration ───────────────────────────────────────
    "Git", "GitHub", "GitLab", "Bitbucket", "SVN",
    "JIRA", "Confluence", "Trello", "Notion",
    "Scrum", "Kanban", "Agile", "SAFe", "Waterfall",
    # ── Data Science & ML ──────────────────────────────────────────────────────
    "Machine Learning", "Deep Learning", "Natural Language Processing",
    "NLP", "Computer Vision", "Reinforcement Learning",
    "Neural Networks", "CNN", "RNN", "LSTM", "Transformer",
    "BERT", "GPT", "LLM", "Generative AI", "RAG",
    "Feature Engineering", "Model Deployment", "MLOps",
    "Data Engineering", "ETL", "Data Pipeline",
    "Power BI", "Tableau", "Looker", "QlikView",
    "Hadoop", "Hive", "Pig", "Flink",
    # ── Integration & Messaging ────────────────────────────────────────────────
    "MuleSoft", "Dell Boomi", "Talend", "Informatica",
    "RabbitMQ", "Apache Kafka", "ActiveMQ", "IBM MQ",
    "SFTP", "FTP", "EDI", "B2B Integration",
    # ── Testing ───────────────────────────────────────────────────────────────
    "Unit Testing", "Integration Testing", "Performance Testing",
    "Load Testing", "Test Automation", "TDD", "BDD",
    "SoapUI", "Postman", "JMeter",
    # ── Project & Process ─────────────────────────────────────────────────────
    "ITIL", "COBIT", "Project Management", "PMP", "Prince2",
    "Six Sigma", "Lean", "BPMN", "SAP Activate",
]

# Normalised lookup set — built once at module load
_NORM_TO_CANONICAL: dict[str, str] = {}


def _normalise(s: str) -> str:
    return re.sub(r"[^a-z0-9\s]", " ", s.lower()).strip()


def _build_index(extra_skills: list[str] | None = None) -> None:
    all_skills = _BUILTIN_SKILLS + (extra_skills or [])
    for skill in all_skills:
        key = _normalise(skill)
        if key and key not in _NORM_TO_CANONICAL:
            _NORM_TO_CANONICAL[key] = skill


def load_esco_csv(csv_path: str) -> None:
    """
    Load the full ESCO skills CSV from the EU Open Data Portal.
    Loads both preferredLabel and altLabels to maximise technical vocabulary coverage.
    altLabels contain the actual tech terms (e.g. "Python") for verbose preferred labels
    like "program in Python".
    """
    path = Path(csv_path)
    if not path.exists():
        logger.warning("esco_csv_not_found: %s — built-in vocabulary active", csv_path)
        return
    loaded = 0
    try:
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Primary label
                preferred = (row.get("preferredLabel") or row.get("title") or "").strip()
                candidates = [preferred] if preferred else []

                # Alternative labels — newline or pipe separated in ESCO CSV
                alt_raw = row.get("altLabels") or ""
                for sep in ("\n", "|", ";"):
                    if sep in alt_raw:
                        candidates.extend(p.strip() for p in alt_raw.split(sep) if p.strip())
                        break
                else:
                    if alt_raw.strip():
                        candidates.append(alt_raw.strip())

                for skill in candidates:
                    if not skill or len(skill) > 60:
                        continue
                    # Skip overly generic sentence-style labels (>5 words, starts with verb)
                    words = skill.split()
                    if len(words) > 5:
                        continue
                    key = _normalise(skill)
                    if key and key not in _NORM_TO_CANONICAL:
                        _NORM_TO_CANONICAL[key] = skill
                        loaded += 1

        logger.info("esco_csv_loaded", extra={"total_vocab_size": len(_NORM_TO_CANONICAL), "added": loaded, "path": csv_path})
    except Exception as exc:
        logger.warning("esco_csv_load_failed: %s", exc)


def _build_ngrams(text: str, max_n: int = 5) -> set[str]:
    """Tokenise normalised text into all n-grams up to max_n words."""
    words = re.split(r"[^a-z0-9]+", _normalise(text))
    words = [w for w in words if w]
    ngrams: set[str] = set()
    for i in range(len(words)):
        for n in range(1, max_n + 1):
            if i + n <= len(words):
                ngrams.add(" ".join(words[i : i + n]))
    return ngrams


def match_esco_skills(text: str) -> list[EscoMatch]:
    """
    Scan text for vocabulary matches. Uses n-gram set intersection for efficiency.
    Single-word entries require a word-boundary match to reduce false positives.
    """
    if not _NORM_TO_CANONICAL:
        _build_index()

    ngrams = _build_ngrams(text)
    seen: set[str] = set()
    results: list[EscoMatch] = []

    for norm_key, canonical in _NORM_TO_CANONICAL.items():
        if norm_key not in ngrams:
            continue
        key = canonical.lower()
        if key not in seen:
            seen.add(key)
            results.append(EscoMatch(value=canonical))

    return results


# Initialise index at import time
_build_index()
