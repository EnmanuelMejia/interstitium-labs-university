#!/usr/bin/env python3
"""Interstitium Labs learning-university curriculum data builder.

Generates, from structured Python data (data-as-code):
  build/data/catalog.json       — academies + paths + modules + assessments + items
  build/data/dedupe-matrix.json — every Rev 2 source mapped kept/merged/dropped
  build/data/sources.json       — every direct source study resource, attributed

Voice: measured hermetic treatise. No emojis, no hype copy.
Honesty rules: official vendor pages / canonical domain roots only; no invented
exam codes, prices, or URLs. Where an exact page URL could not be verified,
the vendor's canonical domain root is used and the note says so.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.normpath(os.path.join(HERE, "..", "data"))
os.makedirs(DATA_DIR, exist_ok=True)

# ---------------------------------------------------------------- academies ---
# Hours are fixed per theme-spirit.md (2026-09-28). Do not change.
ACADEMIES = [
    {"code": "IL-01", "name": "Esoteric Traditions & Digital Hermetica",
     "tagline": "The old systems, read as systems.",
     "hours": 420,
     "blurb": "Hermeticism, Kabbalah, alchemy, and the Dee corpus studied as documented traditions, then the CCRU seminar: Land, hyperstition, the numogram, and cybernetics from Turing to Cybersyn. Literacy is the aim; belief is never tested. Four epistemic tiers keep every claim honest about what kind of claim it is."},
    {"code": "IL-02", "name": "Mathematical Maturity Engine",
     "tagline": "The ground under everything.",
     "hours": 680,
     "blurb": "A unified spine from college algebra through probability and statistics, driven by an adaptive engine in the ALEKS lineage: place, fringe, gate, deepen. Includes a trade-applied Tech Math layer, the electrical-training-Alliance apprenticeship entrance track, and the mathematics beneath quantitative finance."},
    {"code": "IL-03", "name": "Programming Language Forge",
     "tagline": "Languages as instruments, not identities.",
     "hours": 860,
     "blurb": "Python into Java into C++ into data structures, then the systems sequence: organization, operating systems, networks, databases, software engineering. Pearson's programming backbone with an honest account of what the platform itself provides, and MIT's 6-3 curriculum as a reference layer."},
    {"code": "IL-04", "name": "Systems, Linux, Windows & Networks",
     "tagline": "The machine, administered.",
     "hours": 740,
     "blurb": "Linux to RHCSA, Windows systems administration, the Network+ core, and RHCE automation with Ansible. Hands-on and performance-oriented: the operating system is learned by operating it."},
    {"code": "IL-05", "name": "Cloud, DevSecOps, Platform & SRE",
     "tagline": "Ship it, then keep it alive.",
     "hours": 910,
     "blurb": "The DevOps role map at KodeKloud parity, the CNCF Kubernetes certification stack, Terraform as infrastructure-as-code, and zero-trust architecture per NIST SP 800-207. Pipelines, platforms, and the discipline of production."},
    {"code": "IL-06", "name": "Cybersecurity & Secure Engineering",
     "tagline": "Know the attack to earn the defense.",
     "hours": 980,
     "blurb": "The Hackers-Arise curriculum cross-mapped topic by topic against HackTheBox, TryHackMe, OffSec, PortSwigger, SANS, CompTIA, and KodeKloud; the gaps become original Interstitium modules. Aligned to the NICE Workforce Framework's five categories, from offensive operations through defensive engineering to the forward-deployed interface."},
    {"code": "IL-07", "name": "SQL, Data Engineering, Analytics & AI",
     "tagline": "From the row to the model.",
     "hours": 720,
     "blurb": "MongoDB University as the document-database path, the MIT/Stanford/CMU data-school spines distilled, the Stanford CS229-to-CS234 machine-learning arc with MLOps and LLM engineering, and a computing-oriented neuroscience track from spiking neurons to neuromorphic hardware."},
    {"code": "IL-08", "name": "Algorithms, Compilers, Distributed & Formal",
     "tagline": "The deep core, in order.",
     "hours": 640,
     "blurb": "MIT's 6-3 curriculum distilled in prerequisite order, CMU's systems-and-theory spine, and Stanford's core sequence as a cross-walk. For the learner who wants the ground truth beneath the frameworks."},
    {"code": "IL-09", "name": "Adaptive Certification Command",
     "tagline": "Credentials, orchestrated honestly.",
     "hours": 1100,
     "blurb": "CompTIA's full stack, vendor AI certifications, Oracle, Linux Foundation blockchain, Palantir, and the C++/Python Institutes — orchestrated, never cloned. Every path routes to the vendor's own portal for the exam itself; the platform provides preparation, labs, and honest readiness gates."},
    {"code": "IL-10", "name": "Portfolio, Career & Professional Practice",
     "tagline": "The work, presented; the career, directed.",
     "hours": 280,
     "blurb": "The forward-deployed engineer career path with JobRight AI as the outcome layer, Humanmetrics assessment, a Babson-informed entrepreneurship track, and the quantitative-finance ladder from undergraduate preparation to the MIT MicroMasters in Finance and beyond."},
]

# ------------------------------------------------------------------ sources ---
# Every URL is an official vendor page or a canonical domain root. Notes mark
# the cases where only the root could be verified.
# used_in: path ids. canonical: primary "path-id/module-id" for dedupe mapping.
SOURCES = [
    {"name": "Hackers-Arise", "url": "https://hackers-arise.com/", "category": "cybersecurity",
     "description": "OccupyTheWeb's hacker-training library: Linux for hackers, network basics, OSINT, password cracking, Wi-Fi, web exploitation, forensics, SCADA/ICS. Cross-mapped topic-by-topic into the IL-06 offensive spine.",
     "used_in": ["il06-hackers-arise"], "canonical": "il06-hackers-arise/linux-for-hackers"},
    {"name": "HackTheBox", "url": "https://www.hackthebox.com/", "category": "cybersecurity",
     "description": "Hands-on penetration-testing labs and machines; the proving ground for offensive technique.",
     "used_in": ["il06-offensive"], "canonical": "il06-offensive/htb-thm-labs"},
    {"name": "TryHackMe", "url": "https://tryhackme.com/", "category": "cybersecurity",
     "description": "Guided browser-based security labs and learning paths, from complete beginner to advanced red/blue team rooms.",
     "used_in": ["il06-offensive", "il06-defensive"], "canonical": "il06-offensive/htb-thm-labs"},
    {"name": "OffSec", "url": "https://www.offsec.com/", "category": "cybersecurity",
     "description": "Offensive Security: PEN-200 and the OSCP certification; the 'try harder' methodology for penetration testing.",
     "used_in": ["il06-offensive"], "canonical": "il06-offensive/pen200-oscp-map"},
    {"name": "PortSwigger Web Security Academy", "url": "https://portswigger.net/web-security", "category": "cybersecurity",
     "description": "Free web-application security academy with labs: SQLi, XSS, SSRF, authentication flaws, and the Burp Suite methodology.",
     "used_in": ["il06-offensive"], "canonical": "il06-offensive/web-app-exploitation"},
    {"name": "SANS Institute", "url": "https://www.sans.org/", "category": "cybersecurity",
     "description": "Practitioner security training; the blue-team reference for SOC operations, forensics, and incident response depth.",
     "used_in": ["il06-defensive"], "canonical": "il06-defensive/soc-operations"},
    {"name": "CompTIA", "url": "https://www.comptia.org/", "category": "certification",
     "description": "Vendor-neutral IT certifications: A+ through SecurityX/CloudNetX/DataAI; official objectives and stackable-credential maps.",
     "used_in": ["il09-comptia-core", "il09-comptia-security", "il09-comptia-data-cloud", "il06-defensive"],
     "canonical": "il09-comptia-core/aplus-v15"},
    {"name": "NIST NICE Framework (SP 800-181 Rev.1)", "url": "https://csrc.nist.gov/pubs/sp/800/181/r1/final", "category": "cybersecurity",
     "description": "The NICE Workforce Framework: five categories (OG, DD, IO, PD, IN) and 42 work roles; the vocabulary IL-06 aligns to.",
     "used_in": ["il06-hackers-arise"], "canonical": "il06-hackers-arise/nice-framework-map"},
    {"name": "NIST Zero Trust Architecture (SP 800-207)", "url": "https://csrc.nist.gov/pubs/sp/800/207/final", "category": "cybersecurity",
     "description": "The canonical zero-trust architecture publication: tenets, logical components, and deployment models.",
     "used_in": ["il05-zero-trust"], "canonical": "il05-zero-trust/sp800-207-tenets"},
    {"name": "KodeKloud", "url": "https://kodekloud.com/", "category": "cloud-devops",
     "description": "Hands-on DevOps/cloud training with in-browser labs and role-based paths (DevOps, SRE, Platform, Cloud, Kubernetes). The parity baseline for IL-05.",
     "used_in": ["il05-kodekloud"], "canonical": "il05-kodekloud/devops-role-map"},
    {"name": "Kubernetes Documentation", "url": "https://kubernetes.io/", "category": "cloud-devops",
     "description": "Official Kubernetes documentation: concepts, tasks, and reference for the CKA/CKAD/CKS stack.",
     "used_in": ["il05-cloud-native"], "canonical": "il05-cloud-native/cka-prep"},
    {"name": "Terraform Documentation", "url": "https://developer.hashicorp.com/terraform", "category": "cloud-devops",
     "description": "Official Terraform docs: HCL, state, modules, and workflows for infrastructure as code.",
     "used_in": ["il05-terraform"], "canonical": "il05-terraform/terraform-associate-prep"},
    {"name": "Docker", "url": "https://www.docker.com/", "category": "cloud-devops",
     "description": "Container platform documentation and getting-started material for the Docker layer of IL-05.",
     "used_in": ["il05-kodekloud"], "canonical": "il05-kodekloud/containers-docker"},
    {"name": "Jenkins", "url": "https://www.jenkins.io/", "category": "cloud-devops",
     "description": "Automation server documentation: pipelines, agents, and CI/CD practice.",
     "used_in": ["il05-kodekloud"], "canonical": "il05-kodekloud/cicd-jenkins"},
    {"name": "Ansible Documentation", "url": "https://docs.ansible.com/", "category": "cloud-devops",
     "description": "Official Ansible docs: playbooks, roles, inventory, and automation patterns; the RHCE EX294 instrument.",
     "used_in": ["il05-kodekloud", "il04-rhce"], "canonical": "il04-rhce/ex294-ansible-prep"},
    {"name": "Git", "url": "https://git-scm.com/", "category": "programming",
     "description": "Official Git documentation and reference; version control is prerequisite to every engineering path.",
     "used_in": ["il05-kodekloud", "il03-pearson-systems"], "canonical": "il05-kodekloud/git-github"},
    {"name": "Prometheus", "url": "https://prometheus.io/", "category": "cloud-devops",
     "description": "Monitoring and alerting toolkit documentation; the observability layer of the SRE path.",
     "used_in": ["il05-kodekloud"], "canonical": "il05-kodekloud/observability"},
    {"name": "Grafana", "url": "https://grafana.com/", "category": "cloud-devops",
     "description": "Observability dashboards and Loki log aggregation documentation.",
     "used_in": ["il05-kodekloud"], "canonical": "il05-kodekloud/observability"},
    {"name": "MongoDB University", "url": "https://learn.mongodb.com/", "category": "data-ai",
     "description": "Free official MongoDB courses and learning paths: Atlas, aggregation, data modeling, and certification preparation.",
     "used_in": ["il07-mongodb"], "canonical": "il07-mongodb/atlas-foundations"},
    {"name": "MongoDB Introduction Learning Path", "url": "https://learn.mongodb.com/learning-paths/introduction-to-mongodb", "category": "data-ai",
     "description": "MongoDB University's official beginner learning path: Atlas setup, the document model, and first queries.",
     "used_in": ["il07-mongodb"], "canonical": "il07-mongodb/atlas-foundations"},
    {"name": "MIT OpenCourseWare", "url": "https://ocw.mit.edu/", "category": "reference",
     "description": "MIT's open course materials: OCW Scholar sequences (18.01SC/18.02SC/18.03SC/18.06SC) and 6-3 course content. Training only — no certification.",
     "used_in": ["il03-mit-ocw", "il02-math-spine", "il08-mit-63"], "canonical": "il03-mit-ocw/python-6100ab"},
    {"name": "MIT xPRO", "url": "https://xpro.mit.edu/", "category": "certification",
     "description": "MIT's professional-education portal: online professional certificates in cybersecurity, data engineering, and analytics.",
     "used_in": ["il06-fde-interface", "il07-data-schools"], "canonical": "il06-fde-interface/mitxpro-cybersecurity"},
    {"name": "MIT xPRO Cybersecurity", "url": "https://xpro.mit.edu/courses/course-v1:xPRO-PCCYx/", "category": "cybersecurity",
     "description": "24-week online professional certificate in cybersecurity; 36 CEUs, pass/fail at 75 percent. External credential; the platform prepares, MIT xPRO certifies.",
     "used_in": ["il06-fde-interface"], "canonical": "il06-fde-interface/mitxpro-cybersecurity"},
    {"name": "MIT xPRO Advanced Analytics", "url": "https://xpro.mit.edu/courses/course-v1:xPRO+PCDSx+R1/", "category": "data-ai",
     "description": "24-week professional certificate in advanced analytics with AI, ML, and data science; 36 CEUs. External credential.",
     "used_in": ["il07-data-schools"], "canonical": "il07-data-schools/mit-credentials"},
    {"name": "Interview Kickstart FDE", "url": "https://learn.interviewkickstart.com/course/forward-deployed-engineering", "category": "career",
     "description": "Forward Deployed Engineering program: AI Engineering spine (weeks 1-11) into the FDE spine and interview preparation. The interface-engineer career model.",
     "used_in": ["il06-fde-interface", "il10-fde-career"], "canonical": "il06-fde-interface/ik-fde-spine"},
    {"name": "ELVTR", "url": "https://elvtr.com/", "category": "cybersecurity",
     "description": "Live online professional courses, including AI-Aided Cybersecurity (led by a Microsoft principal security architect). External live instruction.",
     "used_in": ["il06-fde-interface"], "canonical": "il06-fde-interface/elvtr-ai-cybersecurity"},
    {"name": "Palantir Learn", "url": "https://learn.palantir.com/", "category": "certification",
     "description": "Palantir's official learning portal: Foundry and AIP courses, speedruns, and deep dives feeding the Associate certification exams.",
     "used_in": ["il09-palantir"], "canonical": "il09-palantir/foundry-data-engineer"},
    {"name": "Humanmetrics", "url": "https://www.humanmetrics.com/", "category": "career",
     "description": "Jung-typology career assessment instrument used as the self-knowledge layer of the IL-10 career path.",
     "used_in": ["il10-humanmetrics"], "canonical": "il10-humanmetrics/typology-assessment"},
    {"name": "JobRight AI", "url": "https://jobright.ai/", "category": "career",
     "description": "AI job-matching platform wired as the career-outcome layer on IL-10 career paths: applications tracked against skills earned.",
     "used_in": ["il10-fde-career"], "canonical": "il10-fde-career/jobright-outcome-layer"},
    {"name": "Babson College", "url": "https://www.babson.edu/", "category": "career",
     "description": "Babson's majors and minors directory informs the entrepreneurship track's curriculum structure. Domain root used; consult the official directory for current offerings.",
     "used_in": ["il10-entrepreneurship"], "canonical": "il10-entrepreneurship/babson-curriculum-map"},
    {"name": "The Academy SF", "url": "https://www.theacademysf.com/", "category": "career",
     "description": "The Horowitz Andreessen Academy: AI, engineering, and founder education in San Francisco. Studied as a contemporary model for practitioner-led technical education.",
     "used_in": ["il10-entrepreneurship"], "canonical": "il10-entrepreneurship/academy-sf-study"},
    {"name": "MIT MicroMasters Finance", "url": "https://micromasters.mit.edu/fin/", "category": "certification",
     "description": "MITx MicroMasters Program Credential in Finance: graduate-level finance courses plus proctored comprehensive exam; a degree-pathway credential.",
     "used_in": ["il10-quant-finance"], "canonical": "il10-quant-finance/micromasters-finance"},
    {"name": "MIT MicroMasters Statistics & Data Science", "url": "https://micromasters.mit.edu/ds/", "category": "data-ai",
     "description": "MITx MicroMasters in Statistics and Data Science: four graduate-level courses plus proctored capstone. The graduate probability/statistics/ML preparation spine.",
     "used_in": ["il07-data-schools"], "canonical": "il07-data-schools/mit-credentials"},
    {"name": "Stanford Online", "url": "https://online.stanford.edu/", "category": "data-ai",
     "description": "Stanford's online graduate and professional certificates, including the data-science and mining-massive-datasets offerings.",
     "used_in": ["il07-data-schools"], "canonical": "il07-data-schools/stanford-credentials"},
    {"name": "Khan Academy", "url": "https://www.khanacademy.org/", "category": "math",
     "description": "Free mastery-based math courses: the course-spine order (arithmetic through linear algebra) and unit/lesson/quiz anatomy absorbed into IL-02.",
     "used_in": ["il02-math-spine"], "canonical": "il02-math-spine/college-algebra"},
    {"name": "ALEKS", "url": "https://www.aleks.com/", "category": "math",
     "description": "McGraw Hill's adaptive math platform: knowledge-space theory, fringe-gated learning, and the Prep-for-Calculus topic grain that shapes IL-02's engine.",
     "used_in": ["il02-math-spine"], "canonical": "il02-math-spine/college-algebra"},
    {"name": "Brilliant", "url": "https://brilliant.org/", "category": "math",
     "description": "Interactive problem-driven math and science courses; the active-problem-solving complement to the IL-02 spine.",
     "used_in": ["il02-math-spine"], "canonical": "il02-math-spine/discrete-mathematics"},
    {"name": "Pearson", "url": "https://www.pearson.com/", "category": "programming",
     "description": "Pearson's programming and MyLab Math courseware: the backbone of the IL-03 programming sequence and the IL-02 MyLab Math layer. Course access via Pearson's official store.",
     "used_in": ["il02-math-spine", "il03-pearson-programming", "il03-pearson-systems"],
     "canonical": "il03-pearson-programming/python-foundations"},
    {"name": "OpenStax", "url": "https://openstax.org/", "category": "math",
     "description": "Rice University's free open textbooks: College Algebra 2e and Precalculus 2e anchor the lower IL-02 spine.",
     "used_in": ["il02-math-spine"], "canonical": "il02-math-spine/college-algebra"},
    {"name": "Princeton University Press", "url": "https://press.princeton.edu/", "category": "math",
     "description": "Princeton-published mathematical texts: Lewis & Zax discrete mathematics, Gunning analysis, MacCluer honors calculus, and the Princeton Companions as reference backbones.",
     "used_in": ["il02-math-spine"], "canonical": "il02-math-spine/discrete-mathematics"},
    {"name": "SkillsPrep", "url": "https://www.skillsprep.org/", "category": "career",
     "description": "The electrical training ALLIANCE's online learning system: interim credentials (Constructing Your Future), Tech Math, Reading Comprehension, and the etA preparatory courses.",
     "used_in": ["il02-tech-math", "il02-electrician"], "canonical": "il02-electrician/eta-interim-credentials"},
    {"name": "electrical training ALLIANCE", "url": "https://www.electricaltrainingalliance.org/", "category": "career",
     "description": "The IBEW/NECA joint apprenticeship training organization (etA): aptitude-test requirements, interim credentials, and the 270 training centers. Domain root used.",
     "used_in": ["il02-electrician"], "canonical": "il02-electrician/eta-interim-credentials"},
    {"name": "Red Hat Training", "url": "https://www.redhat.com/en/services/training", "category": "certification",
     "description": "Official Red Hat training and certification: RHCSA (EX200) and RHCE (EX294) hands-on performance exams.",
     "used_in": ["il04-linux", "il04-rhce"], "canonical": "il04-linux/rhcsa-ex200-prep"},
    {"name": "Linux Professional Institute", "url": "https://www.lpi.org/", "category": "certification",
     "description": "Vendor-neutral Linux certification: Linux Essentials (lifetime) and LPIC-1/2/3; official objectives and topic weightings.",
     "used_in": ["il04-linux"], "canonical": "il04-linux/lpic-track"},
    {"name": "Oracle Education", "url": "https://education.oracle.com/", "category": "certification",
     "description": "Oracle University: Java SE 21 (1Z0-830), Database SQL (1Z0-071), and OCI 2026 certification paths with official objectives.",
     "used_in": ["il09-oracle"], "canonical": "il09-oracle/java-se21"},
    {"name": "C++ Institute", "url": "https://cppinstitute.org/", "category": "certification",
     "description": "Official C/C++ certification hierarchy: CPE/CPA/CPP; exam formats, syllabi, and pricing published by the Institute.",
     "used_in": ["il09-cpp-python"], "canonical": "il09-cpp-python/cpp-track"},
    {"name": "Python Institute", "url": "https://pythoninstitute.org/", "category": "certification",
     "description": "Official Python certification hierarchy: PCEP/PCAP/PCPP1/PCPP2; syllabi and free aligned courses from OpenEDG.",
     "used_in": ["il09-cpp-python"], "canonical": "il09-cpp-python/python-track"},
    {"name": "Linux Foundation Training", "url": "https://training.linuxfoundation.org/", "category": "certification",
     "description": "Linux Foundation education: blockchain certifications (HFCP, BCP) and the CNCF Kubernetes certification family.",
     "used_in": ["il09-lf-blockchain", "il05-cloud-native"], "canonical": "il09-lf-blockchain/hfcp-prep"},
    {"name": "CNCF", "url": "https://www.cncf.io/", "category": "cloud-devops",
     "description": "Cloud Native Computing Foundation: the Kubernetes certification program (KCNA, CKA, CKAD, CKS, KCSA) and training-partner ecosystem.",
     "used_in": ["il05-cloud-native"], "canonical": "il05-cloud-native/cka-prep"},
    {"name": "Webucator", "url": "https://www.webucator.com/", "category": "reference",
     "description": "Corporate/self-paced IT training vendor (Java+Python and full-stack bundles). Studied as competitive context; its bundles are merged into IL-03's canonical programming sequence rather than duplicated.",
     "used_in": ["il03-pearson-systems"], "canonical": "il03-pearson-systems/web-fundamentals"},
    {"name": "Per Scholas", "url": "https://perscholas.org/", "category": "reference",
     "description": "Tuition-free nonprofit tech training (Cloud DevOps, Software Engineering, Cybersecurity cohorts). Studied as competitive context; its DevOps cohort maps onto IL-05's canonical path.",
     "used_in": ["il05-kodekloud"], "canonical": "il05-kodekloud/devops-role-map"},
    {"name": "Neuronal Dynamics (EPFL)", "url": "https://neuronaldynamics.epfl.ch/", "category": "data-ai",
     "description": "Gerstner, Kistler, Naud & Paninski's open computational-neuroscience text with video lectures, Python exercises, and slides. The open anchor for IL-07's NeuroAI track.",
     "used_in": ["il07-neuroai"], "canonical": "il07-neuroai/comp-neuro-foundations"},
    {"name": "MIT Press", "url": "https://mitpress.mit.edu/", "category": "reference",
     "description": "Publisher of Dayan & Abbott's Theoretical Neuroscience, the field's standard graduate text; cited as the anchor reference, not reproduced.",
     "used_in": ["il07-neuroai"], "canonical": "il07-neuroai/comp-neuro-foundations"},
    {"name": "Internet Sacred Text Archive", "url": "https://sacred-texts.com/", "category": "esoteric",
     "description": "Public-domain archive of religious and esoteric texts, including Hermetic and alchemical primary sources in translation.",
     "used_in": ["il01-hermetic-foundations", "il01-dee-enochian"], "canonical": "il01-hermetic-foundations/hermetic-corpus"},
    {"name": "Project Gutenberg", "url": "https://www.gutenberg.org/", "category": "esoteric",
     "description": "Public-domain ebook library carrying historical esoteric works used as primary-source reading in IL-01.",
     "used_in": ["il01-hermetic-foundations"], "canonical": "il01-hermetic-foundations/hermetic-corpus"},
    {"name": "CCRU Archive", "url": "https://ccru.net/", "category": "esoteric",
     "description": "The Cybernetic Culture Research Unit's archived writings: the primary corpus for the IL-01 hyperstition seminar.",
     "used_in": ["il01-ccru-seminar"], "canonical": "il01-ccru-seminar/land-ccru-corpus"},
    {"name": "Principia Cybernetica", "url": "http://pespmc1.vub.ac.be/", "category": "esoteric",
     "description": "The Principia Cybernetica Web: cybernetics and systems-theory reference for the IL-01 cybernetics arc.",
     "used_in": ["il01-ccru-seminar"], "canonical": "il01-ccru-seminar/cybernetics-arc"},
    {"name": "Hugging Face LLM Course", "url": "https://huggingface.co/learn/llm-course", "category": "data-ai",
     "description": "Hugging Face's open LLM course: transformers, fine-tuning, RLHF, and evaluation; the applied spine of the LLM-engineering module.",
     "used_in": ["il07-ai-ml"], "canonical": "il07-ai-ml/llm-engineering"},
    {"name": "PyTorch", "url": "https://pytorch.org/", "category": "data-ai",
     "description": "Official PyTorch tutorials and documentation; the primary framework of the IL-07 deep-learning modules.",
     "used_in": ["il07-ai-ml"], "canonical": "il07-ai-ml/deep-learning-cs230"},
    {"name": "CMU SCS Course Catalog", "url": "http://coursecatalog.web.cmu.edu/", "category": "reference",
     "description": "Carnegie Mellon's official School of Computer Science catalog: the 15-112 through 15-451 core sequence and constrained electives used as the IL-08 CMU spine.",
     "used_in": ["il08-cmu-cs"], "canonical": "il08-cmu-cs/imperative-functional-core"},
    {"name": "Stanford ExploreCourses", "url": "https://explorecourses.stanford.edu/", "category": "reference",
     "description": "Stanford's official course catalog: CS 106A/B through CS 161 and the depth tracks used as the IL-08 Stanford cross-walk.",
     "used_in": ["il08-stanford-cs"], "canonical": "il08-stanford-cs/programming-abstractions"},
    {"name": "NEURON Simulator", "url": "https://www.neuron.yale.edu/", "category": "data-ai",
     "description": "The NEURON simulator for detailed biophysical/compartmental neuron models; the lab instrument for IL-07's neural-modeling module.",
     "used_in": ["il07-neuroai"], "canonical": "il07-neuroai/neural-modeling-simulation"},
    {"name": "Brian2", "url": "https://brian2.readthedocs.io/", "category": "data-ai",
     "description": "Brian2 spiking neural-network simulator documentation; the flexible lab instrument for IL-07's neural-modeling module.",
     "used_in": ["il07-neuroai"], "canonical": "il07-neuroai/neural-modeling-simulation"},
    {"name": "Anthropic", "url": "https://www.anthropic.com/", "category": "certification",
     "description": "Anthropic's Claude Certified exams (Associate/Developer/Architect); exam-booking details were not on a retrievable official page, so the domain root is given and specs are not asserted.",
     "used_in": ["il09-vendor-ai"], "canonical": "il09-vendor-ai/anthropic-claude-certs"},
    {"name": "OpenAI", "url": "https://openai.com/", "category": "certification",
     "description": "OpenAI certifications remain employer/university pilot-only with no public exam spec; tracked as a program page, never implied as bookable.",
     "used_in": ["il09-vendor-ai"], "canonical": "il09-vendor-ai/openai-program-track"},
    {"name": "NVIDIA", "url": "https://www.nvidia.com/", "category": "certification",
     "description": "NVIDIA Certified Associate: Generative AI LLMs (NCA-GENL); official objectives page not retrieved, so specs are not asserted.",
     "used_in": ["il09-vendor-ai"], "canonical": "il09-vendor-ai/nvidia-databricks"},
    {"name": "Databricks", "url": "https://www.databricks.com/", "category": "certification",
     "description": "Databricks Certified Generative AI Engineer Associate; official page not verified from the vendor domain, so specs are not asserted.",
     "used_in": ["il09-vendor-ai"], "canonical": "il09-vendor-ai/nvidia-databricks"},
    {"name": "Microsoft Learn", "url": "https://learn.microsoft.com/", "category": "certification",
     "description": "Microsoft's certification portal: Azure AI Fundamentals (AI-901) and Azure AI Apps and Agents Developer Associate (AI-103); consult Microsoft Learn for current exam pages.",
     "used_in": ["il09-vendor-ai"], "canonical": "il09-vendor-ai/microsoft-azure-ai"},
    {"name": "Google Cloud", "url": "https://cloud.google.com/", "category": "certification",
     "description": "Google Cloud credentials: Generative AI Leader and Professional Machine Learning Engineer; consult Google Cloud's official pages for current blueprints.",
     "used_in": ["il09-vendor-ai"], "canonical": "il09-vendor-ai/google-cloud-ai"},
    {"name": "AWS Training", "url": "https://aws.amazon.com/training/", "category": "certification",
     "description": "AWS Training and Certification: AI Practitioner (AIF-C01) and Machine Learning Engineer Associate (MLA-C02); consult AWS for current exam guides.",
     "used_in": ["il09-vendor-ai"], "canonical": "il09-vendor-ai/aws-ai-ml"},
]

SRC = {s["name"]: s for s in SOURCES}

# ------------------------------------------------------------- path helpers ---
def S(name, note):
    """Module source entry from the registry, with a per-module note."""
    s = SRC[name]
    return {"name": s["name"], "url": s["url"], "note": note}


def M(mid, title, kind, topics, sources, il_provides):
    return {"id": mid, "title": title, "kind": kind, "topics": topics,
            "sources": sources, "il_provides": il_provides}


def A(aid, title, kind, questions, minutes, items):
    return {"id": aid, "title": title, "kind": kind, "questions": questions,
            "minutes": minutes, "items": items}


def I(q, choices, answer, explain, topic):
    return {"q": q, "choices": choices, "answer": answer,
            "explain": explain, "topic": topic}


def P(pid, academy, title, subtitle, ptype, difficulty, hours, tags, modules,
      assessments=None):
    return {"id": pid, "academy": academy, "title": title, "subtitle": subtitle,
            "type": ptype, "difficulty": difficulty, "hours": hours,
            "status": "published", "tags": tags, "modules": modules,
            "assessments": assessments or []}


PATHS = []

# ============================================================ IL-01: Esoteric
PATHS.append(P(
    "il01-hermetic-foundations", "IL-01",
    "Hermetic Foundations",
    "The Western esoteric current from Alexandria to the present, studied as documented history.",
    "foundations", "beginner", 140, ["hermeticism", "foundations", "literacy"],
    [
        M("hermetic-corpus", "The Hermetic Corpus", "core",
          ["Corpus Hermeticum and Asclepius", "Nag Hammadi context", "Late-antique Alexandria", "DOCUMENTED tier evidence"],
          [S("Internet Sacred Text Archive", "The Hermetic writings in public-domain translation; anchor, not copy."),
           S("Project Gutenberg", "Historical esoteric works for primary-source reading assignments.")],
          "Reading order and study apparatus: which treatises matter, what the scholarship says, and where the record goes silent. The platform writes its own exposition; the archive supplies the primary text."),
        M("golden-dawn", "The Golden Dawn", "core",
          ["Order history 1888-1903", "Grade system and curriculum", "The Lesser Banishing Ritual of the Pentagram as study object", "DOCUMENTED tier: what the papers actually say"],
          [S("Internet Sacred Text Archive", "Golden Dawn papers in public-domain collections.")],
          "A curriculum map of the Golden Dawn's grade system treated as a syllabus — honest about what is historical record versus later reconstruction."),
        M("wicca-thelema", "Wicca and Thelema", "core",
          ["Gardnerian Wicca: origins and claims", "Crowley, A.'.A.'., and O.T.O.", "TRADITIONAL vs CONTESTED tiering", "The Book of the Law as primary text"],
          [S("Internet Sacred Text Archive", "Primary texts in public-domain or fair-use excerpt."),
           S("Project Gutenberg", "Period context: late-Victorian occult revival literature.")],
          "Epistemic-tier labeling on every claim: what is documented biography, what is traditional transmission, what is contested. Assessments test the student's ability to keep those apart."),
        M("chaos-magic", "Chaos Magic and Discordianism", "core",
          ["Austin Osman Spare and sigilization", "Peter Carroll and paradigm shifting", "The Principia Discordia", "Belief as instrument"],
          [S("Project Gutenberg", "Spare-era primary material where in public domain.")],
          "Paradigm-shifting taught as a cognitive technique with honest limits; the Discordian corpus as a case study in engineered myth."),
        M("kabbalistic-frames", "Hermetic Qabalah", "core",
          ["The Tree of Life as a map", "Correspondences: planets, elements, tarot", "Tarot as a study instrument", "TRADITIONAL tier: the transmission story"],
          [S("Internet Sacred Text Archive", "Qabalistic texts and correspondence tables in translation.")],
          "A correspondence engine: the Tree of Life taught as an information-organization system, with the transmission story kept separate from the documented history."),
        M("alchemy-study", "Alchemy", "core",
          ["Alexandrian roots", "Paracelsus and iatrochemistry", "Laboratory vs. spiritual readings", "DOCUMENTED tier: the textual record"],
          [S("Internet Sacred Text Archive", "Alchemical treatises in translation.")],
          "The textual record surveyed without the romance: what the manuscripts say, what the chemists did, and where the two readings diverge."),
        M("four-tiers-literacy", "The Four Epistemic Tiers", "core",
          ["DOCUMENTED", "SCHOLARLY CONSENSUS", "TRADITIONAL", "CONTESTED", "Assessments test literacy, never belief"],
          [S("Internet Sacred Text Archive", "Worked examples drawn from the modules above.")],
          "The academy's grading contract: every assessment item is tagged to a tier, and no item ever asks the learner to affirm a belief."),
    ]))

PATHS.append(P(
    "il01-dee-enochian", "IL-01",
    "Dee and the Enochian System",
    "John Dee's documented life, the Monas Hieroglyphica, and the angelic conversations read as primary sources.",
    "foundations", "intermediate", 120, ["enochian", "dee", "kabbalah", "primary-sources"],
    [
        M("dee-life", "John Dee: The Documented Life", "core",
          ["1527-1608/09: the biographical record", "Court mathematician, navigator, advisor", "The Mortlake library", "DOCUMENTED tier throughout"],
          [S("Internet Sacred Text Archive", "Dee-adjacent primary material in translation.")],
          "A biography built only from the record: what Dee did, wrote, and owned — separated from three centuries of later myth-making."),
        M("enochian-alphabet", "The Enochian Alphabet", "core",
          ["The 21-letter alphabet", "Received 6 May 1583", "Letterforms and their names", "DOCUMENTED: the diaries as evidence"],
          [S("Internet Sacred Text Archive", "Published Enochian tables and key material.")],
          "The alphabet as a writing system: letterforms, names, and the documented circumstances of reception, taught as literacy in a historical script."),
        M("angelical-keys", "The Angelical Keys", "core",
          ["The 48/49 Calls: structure", "The diaries 1581/82-1589", "Scrying practice: Kelly and Dee", "SCHOLARLY CONSENSUS on the record"],
          [S("Internet Sacred Text Archive", "The Calls in published transcription.")],
          "Structural reading of the Calls: what they are, how they are organized, and what the diaries actually document — with the scholarly consensus stated plainly."),
        M("monas-hieroglyphica", "Monas Hieroglyphica (1564)", "core",
          ["The glyph as synthesis", "Geometry, alchemy, and astronomy in one figure", "Dee's theorems", "Reception history"],
          [S("Internet Sacred Text Archive", "The Monas in translation with the glyph.")],
          "A slow reading of Dee's most compressed work: the glyph unpacked theorem by theorem, as an exercise in symbolic literacy."),
        M("scholastic-reception", "Scholarly Reception", "core",
          ["Casaubon's True and Faithful Relation", "Yates and the modern recovery", "Current scholarship", "CONTESTED: the open questions"],
          [S("Internet Sacred Text Archive", "Casaubon-era material in the public domain.")],
          "The historiography: how Dee was read in 1659, in 1972, and now — so the learner can see scholarship itself as a moving record."),
        M("hermetic-praxis-literacy", "Praxis as Literacy", "core",
          ["Reading Dee's corpus end to end", "Keeping a commonplace book", "The tiered reading journal", "No belief required"],
          [S("Internet Sacred Text Archive", "The corpus for the capstone reading.")],
          "The capstone: a guided, tier-tagged reading journal through the Dee corpus, assessed on accuracy of summary and tier discipline — never on conviction."),
    ]))

PATHS.append(P(
    "il01-ccru-seminar", "IL-01",
    "The CCRU Seminar: Hyperstition and Cybernetics",
    "Nick Land and the CCRU, the numogram, meme chaos-magic, and cybernetics from Turing to Cybersyn.",
    "foundations", "advanced", 160, ["ccru", "hyperstition", "cybernetics", "seminar"],
    [
        M("land-ccru-corpus", "The Land/CCRU Corpus", "core",
          ["Nick Land's 1990s writings", "The CCRU: who, where, what", "Primary texts in reading order", "The archive as artifact"],
          [S("CCRU Archive", "The primary corpus: archived CCRU writings.")],
          "A seminar reading order through difficult primary texts, with original study guides that paraphrase nothing and summarize honestly. The archive is the text; the platform is the apparatus."),
        M("hyperstition-theory", "Hyperstition", "core",
          ["Fiction as an engine", "The hyperstitional circuit", "Examples and counter-examples", "CONTESTED: the theory's status"],
          [S("CCRU Archive", "The hyperstition texts in the archive.")],
          "Hyperstition taught as a theory with a status label: what it claims, what would falsify it, and where it shades into rhetoric."),
        M("numogram-syzygies", "The Numogram and Syzygies", "core",
          ["Decimal sorcery: the numogram", "Syzygies and currents", "Working the diagram", "Reading a technical diagram as a text"],
          [S("CCRU Archive", "The numogram writings and diagrams.")],
          "Diagram literacy: the numogram read the way an engineer reads a schematic — every line accounted for, every claim tiered."),
        M("meme-chaos-magic", "Meme Chaos-Magic Theory", "core",
          ["Sigils in the network age", "Memes as hyperstitional objects", "The chaos-magic lineage", "Attention as a medium"],
          [S("CCRU Archive", "CCRU-adjacent writings on media and magic.")],
          "An original synthesis: the chaos-magic paradigm-shifting technique applied to network-native symbols, with the mechanism stated as hypothesis, not fact."),
        M("cybernetics-arc", "Cybernetics: Turing to the Present", "core",
          ["Wiener and first-order cybernetics", "Second-order cybernetics", "Turing's shadow over the field", "The Macy conferences"],
          [S("Principia Cybernetica", "Cybernetics and systems-theory reference material.")],
          "The intellectual history as a prerequisite spine: you cannot read the CCRU on cybernetics without Wiener, and you cannot read Wiener without the Macy conferences."),
        M("cybersyn-case", "Project Cybersyn", "core",
          ["Allende's Chile, 1971-1973", "Stafford Beer and the viable system model", "The operations room", "What was actually built vs. what is mythologized"],
          [S("Principia Cybernetica", "Viable-system-model reference material.")],
          "A case study in applied cybernetics with the myth stripped out: the documented system, its real limits, and what the 1973 coup foreclosed."),
    ],
    [A("il01-ccru-gate", "CCRU Seminar Gate", "diagnostic", 0, 0,
       [I("Hyperstition, in one sentence, claims that fictions can ___.",
          ["describe the past accurately", "bootstrap themselves into reality through belief-driven feedback", "replace empirical science", "prove mathematical theorems"],
          1, "The hyperstitional circuit: fiction -> belief -> action -> conditions that make the fiction real. The seminar treats this as a theory with a status label, not a fact.", "hyperstition"),
        I("The numogram is best approached as ___.",
          ["a proof of telepathy", "a technical diagram to be read line by line", "a random number table", "a musical score"],
          1, "Diagram literacy: the numogram is read the way an engineer reads a schematic — every line accounted for.", "numogram"),
        I("Project Cybersyn was ___.",
          ["a fictional AI from a novel", "a real cybernetic economic-management system built in Chile 1971-1973", "a cryptocurrency", "a 19th-century telegraph network"],
          1, "Cybersyn was Stafford Beer's viable-system-model applied to the Chilean economy under Allende, ended by the 1973 coup.", "cybersyn"),
        I("In the academy's epistemic tiers, CONTESTED means ___.",
          ["proven false", "a claim scholars actively dispute or that lacks evidence", "a secret teaching", "a documented fact"],
          1, "CONTESTED marks claims without settled evidence or with active scholarly dispute — the honest label for hyperstition's stronger claims.", "tiers"),
        I("Second-order cybernetics differs from first-order in that it ___.",
          ["uses faster computers", "includes the observer in the system observed", "was invented by Turing", "rejects feedback"],
          1, "Second-order cybernetics (von Foerster) makes the observer part of the system — the move the CCRU inherits.", "cybernetics")])]))

# ============================================================ IL-02: Math
PATHS.append(P(
    "il02-math-spine", "IL-02",
    "The Unified Mathematical Spine",
    "College algebra through probability and statistics, in the Khan-verified course order, driven by an ALEKS-lineage adaptive engine.",
    "foundations", "beginner", 420, ["algebra", "calculus", "linear-algebra", "probability", "adaptive"],
    [
        M("college-algebra", "College Algebra", "math",
          ["Equations and inequalities", "Functions and graphs", "Polynomial and rational functions", "Exponentials and logarithms"],
          [S("OpenStax", "College Algebra 2e: the free open textbook anchoring this module."),
           S("Khan Academy", "Course-spine order and unit/lesson/quiz anatomy."),
           S("ALEKS", "Knowledge-space fringe gating: fractions before algebra emerges from the graph."),
           S("Pearson", "MyLab Math as the commercial practice layer; course access via Pearson's official store.")],
          "The adaptive engine itself: placement, outer-fringe sequencing, streak-aware mastery scoring, and retention checks in the ALEKS lineage — built by Interstitium, not licensed."),
        M("trigonometry", "Trigonometry", "math",
          ["Right-triangle trigonometry", "The unit circle", "Graphs of trig functions", "Identities and equations"],
          [S("OpenStax", "Precalculus 2e trigonometry chapters: the open backbone."),
           S("Brilliant", "Interactive problem-driven trigonometry practice.")],
          "Unit-circle fluency drills and identity-proving exercises with step-level Socratic feedback from Noah — wrong answers get tips, never answer dumps."),
        M("precalculus", "Precalculus", "math",
          ["Composite and inverse functions", "Complex numbers", "Vectors and matrices", "Conic sections, series, limits preview"],
          [S("OpenStax", "Precalculus 2e: the open backbone."),
           S("ALEKS", "The Prep-for-Calculus topic grain (281 core + 130 extended topics) as the authoring model.")],
          "The ALEKS Prep-for-Calculus slice structure reimplemented as the platform's topic graph: slice = syllabus chapter sized by weight, dark = mastered, blocked slices explain their prerequisites."),
        M("calculus-1", "Calculus I", "math",
          ["Limits and continuity", "Derivatives: definition and rules", "Applications of derivatives", "Integrals and the Fundamental Theorem"],
          [S("MIT OpenCourseWare", "OCW Scholar single-variable calculus sequence as reference."),
           S("Princeton University Press", "MacCluer, Honors Calculus: the rigorous track anchor.")],
          "Parameterized problem generators (the adaptive engine's genMath): every skill ships with an instance bank so learners can never memorize a single worked example."),
        M("calculus-2", "Calculus II", "math",
          ["Integration techniques", "Applications of integrals", "Parametric, polar, vector-valued functions", "Series and Taylor expansions"],
          [S("MIT OpenCourseWare", "OCW Scholar multivariable-adjacent sequences as reference."),
           S("Khan Academy", "AP/College Calculus BC unit structure.")],
          "Series-convergence proof exercises with line-by-line checking, and the differential-equations bridge into the applied modules."),
        M("discrete-mathematics", "Discrete Mathematics", "math",
          ["Logic and proofs", "Sets, functions, combinatorics", "Graphs", "Cryptography and automata previews"],
          [S("Princeton University Press", "Lewis & Zax, Essential Discrete Mathematics for Computer Science: the full backbone."),
           S("Brilliant", "Interactive combinatorics and graph problems.")],
          "Proof-checking exercises in the CMU 15-151 spirit: structural induction with machine-checked steps, authored originally for the platform."),
        M("linear-algebra", "Linear Algebra", "math",
          ["Vectors and matrices", "Eigenvalues and eigenvectors", "Matrix calculus for ML", "Least squares and SVD"],
          [S("MIT OpenCourseWare", "OCW Scholar linear algebra (Strang lineage) as reference."),
           S("Brilliant", "Interactive eigenvalue and transformation visualizations.")],
          "The ML-gate appendix: matrix calculus through gradients, sized exactly to what CS229/CS231N prerequisites demand — no more, no less."),
        M("probability-statistics", "Probability and Statistics", "math",
          ["Random variables and distributions", "Bayes, MLE, MAP", "LLN and CLT", "Regression and hypothesis testing"],
          [S("Khan Academy", "Statistics & probability course structure."),
           S("ALEKS", "Pre-Statistics and Introduction to Statistics topic grain."),
           S("Princeton University Press", "Hansen (advanced) and Blitzstein & Hwang (elementary) as anchors.")],
          "Simulation-based intuition builders: the learner runs the Law of Large Numbers and the Central Limit Theorem as experiments before meeting them as theorems."),
    ]))

PATHS.append(P(
    "il02-tech-math", "IL-02",
    "Tech Math: Trade-Applied Mathematics",
    "Arithmetic fluency through shop mathematics, capped by the SkillsPrep Tech Math course.",
    "foundations", "beginner", 80, ["trades", "applied-math", "skillsprep"],
    [
        M("arithmetic-fluency", "Arithmetic Fluency", "math",
          ["Whole-number operations", "Fractions, decimals, percents", "Fact fluency under time", "Estimation"],
          [S("ALEKS", "The QuickTables pattern: game-like arithmetic fact fluency.")],
          "Timed fluency drills with the ALEKS streak model (+1/+2-streak/-1): speed without accuracy is scored as what it is."),
        M("measurement-units", "Measurement and Units", "math",
          ["US customary and metric", "Dimensional analysis", "Precision and tolerance", "Reading instruments"],
          [S("SkillsPrep", "SkillsPrep's trade-context measurement material.")],
          "Conversion ladders built from real trade documents: the learner converts what electricians, machinists, and builders actually convert."),
        M("shop-math", "Shop Mathematics", "math",
          ["Ratio and proportion in the shop", "Percent applications: markup, waste, discount", "Area, volume, and material estimation", "Reading drawings and scales"],
          [S("SkillsPrep", "SkillsPrep trade-applied problem contexts.")],
          "Word problems drawn from the trades, with diagrams: conduit fill, material takeoff, and layout geometry."),
        M("skillsprep-tech-math-cap", "SkillsPrep Tech Math Capstone", "exam_prep",
          ["The official Tech Math course", "Readiness verification", "Gap diagnosis against the etA aptitude battery"],
          [S("SkillsPrep", "The official Tech Math course on skillsprep.org; enrollment is external.")],
          "A readiness gate mapped to the SkillsPrep course objectives: the platform diagnoses gaps, SkillsPrep delivers the official course, the learner returns verified."),
    ]))

PATHS.append(P(
    "il02-electrician", "IL-02",
    "Electrician Apprenticeship: etA Entrance",
    "The electrical training ALLIANCE interim credentials, SQ3R technical reading, and the timed aptitude batteries.",
    "career", "beginner", 150, ["electrician", "apprenticeship", "eta", "aptitude"],
    [
        M("eta-interim-credentials", "etA Interim Credentials", "career",
          ["Constructing Your Future", "Electrical Job Information 1", "Applied Codeology 2023", "Electrical Theory 1 (DC)", "Construction Drawings"],
          [S("SkillsPrep", "The etA interim-credential courses on skillsprep.org; enrollment is external."),
           S("electrical training ALLIANCE", "Aptitude-test requirements and the 270 IBEW/NECA training centers.")],
          "A credential checklist with honest sequencing: which interim credential unlocks what, what the aptitude test actually demands, and where the platform's drills fit."),
        M("sq3r-reading", "SQ3R Technical Reading", "career",
          ["Survey, Question, Read, Recite, Review", "Reading to perform a task", "Drawing conclusions from technical text", "Applying reading methods to math"],
          [S("SkillsPrep", "The official Reading Comprehension course ($39): SQ3R, key-component identification, conclusions.")],
          "Original technical passages with tiered questions (the reading battery): the platform authors its own passages so practice never leaks the real instrument."),
        M("harassment-prevention", "Harassment Prevention", "career",
          ["Workplace conduct standards", "Reporting channels", "Bystander responsibility"],
          [S("SkillsPrep", "The etA harassment-prevention requirement; delivered via the official course.")],
          "A completion checklist and scenario-review guide; the credential itself is earned through the official course."),
        M("core-budgeting", "Core Budgeting and Credit", "career",
          ["Budget construction", "Credit scores: what moves them", "Apprentice-wage planning"],
          [S("SkillsPrep", "The etA core-budgeting and credit-score material.")],
          "Apprentice-wage budget worksheets: the learner builds a real budget on first-year apprentice pay."),
        M("well-being-101", "Well-Being 101", "career",
          ["Physical demands of the trade", "Sleep, nutrition, recovery", "Stress and help resources"],
          [S("SkillsPrep", "The etA Well-Being 101 course.")],
          "A personal readiness plan template; the credential is earned through the official course."),
        M("neca-nemra-codes", "NECA-NEMRA Codes Literacy", "career",
          ["How code articles are organized", "'Shall' vs. 'shall be permitted'", "Exceptions are never assumed", "Finding an article under time"],
          [S("SkillsPrep", "Applied Codeology 2023 as the official code-literacy course.")],
          "Timed article-finding drills and code-language parsing exercises authored originally; the NEC itself is never reproduced."),
        M("algebra-readiness", "Algebra Readiness Fringe", "math",
          ["The aptitude-test algebra fringe", "Fractions through functions", "Number series"],
          [S("ALEKS", "Fringe-gated sequencing: the algebra nodes that gate the battery.")],
          "The outer fringe computed from the battery's demands: the learner sees exactly which algebra nodes stand between them and test day."),
    ],
    [A("etapps-algebra-battery", "etA Aptitude: Algebra Battery", "timed", 33, 46, []),
     A("etapps-reading-battery", "etA Aptitude: Reading Battery", "timed", 36, 51, [])]))

PATHS.append(P(
    "il02-quant-math", "IL-02",
    "Quantitative Finance Mathematics",
    "The mathematical prerequisites beneath the quant ladder: measure-theoretic probability, stochastic processes, and financial mathematics.",
    "foundations", "advanced", 30, ["quant", "probability", "stochastic"],
    [
        M("probability-measure", "Measure-Theoretic Probability (Survey)", "math",
          ["Sigma-algebras and measures", "Random variables as measurable functions", "Expectation via integration", "Convergence modes"],
          [S("MIT OpenCourseWare", "OCW probability lineage (18.675 direction) as reference."),
           S("Princeton University Press", "Hansen, Probability and Statistics for Economists: the rigorous anchor.")],
          "A survey pitched at the quant entrant: enough measure theory to read stochastic calculus later, with the honest note that this is a survey, not a graduate course."),
        M("stochastic-processes", "Stochastic Processes", "math",
          ["Markov chains", "Queues and simulation", "Random walks", "Brownian motion preview"],
          [S("Princeton University Press", "Stewart, Probability, Markov Chains, Queues, and Simulation: the anchor.")],
          "Simulation-first: the learner builds Markov chains and queues as running simulations before meeting them as theorems."),
        M("financial-math", "Financial Mathematics Prerequisites", "math",
          ["Time value of money", "Returns, variance, covariance", "The Black-Scholes prerequisites", "Discrete-time pricing models"],
          [S("MIT MicroMasters Finance", "The MicroMasters Finance curriculum as the downstream target.")],
          "The bridge module: every topic is labeled with where it reappears in the MicroMasters Finance sequence, so the learner sees the ladder whole."),
    ]))

# ============================================================ IL-03: Programming
PATHS.append(P(
    "il03-pearson-programming", "IL-03",
    "The Programming Backbone: Python, Java, C++, DSA",
    "Python into Java into C++ into data structures and algorithms. Pearson courseware with an honest account of what the platform adds.",
    "foundations", "beginner", 320, ["python", "java", "cpp", "dsa", "pearson"],
    [
        M("python-foundations", "Python Foundations", "core",
          ["Syntax and control flow", "Functions and modules", "OOP in Python", "Standard library essentials"],
          [S("Pearson", "Pearson Python courseware: the backbone content; course access via Pearson's official store.")],
          "il_provides: the adaptive layer over Pearson's spine — placement, fringe sequencing, parameterized coding exercises, and Noah's Socratic debugging. Pearson supplies the courseware; Interstitium supplies the engine. Where Pearson course access is unavailable, the platform's own Python track stands as the open fallback."),
        M("java-programming", "Java Programming", "core",
          ["OOP: classes, inheritance, interfaces", "Generics and collections", "Streams and lambdas", "Virtual threads (Java 21)"],
          [S("Pearson", "Pearson Java courseware; course access via Pearson's official store."),
           S("Oracle Education", "Java SE 21 (1Z0-830) official objectives as the topic map.")],
          "il_provides: the 1Z0-830 objective map reimplemented as a readiness dashboard — every objective becomes a gated skill node with its own instance bank."),
        M("cpp-programming", "C++ Programming", "core",
          ["Memory: pointers, references, RAII", "The STL", "Move semantics", "Build toolchains"],
          [S("Pearson", "Pearson C++ courseware; course access via Pearson's official store."),
           S("C++ Institute", "CPE/CPA official syllabi as the topic map.")],
          "il_provides: memory-model visualizations and UB (undefined-behavior) drills authored originally — the mistakes C++ punishes, taught before they happen."),
        M("dsa-core", "Data Structures and Algorithms", "core",
          ["Arrays, lists, stacks, queues", "Trees, heaps, hash tables", "Graphs: traversal, shortest paths", "Sorting, divide-and-conquer, dynamic programming"],
          [S("Pearson", "Pearson DSA courseware; course access via Pearson's official store.")],
          "il_provides: the canonical algorithms node for the whole university — IL-08's theory track deepens it, but this module is the single place the concept lives. No duplicated courses."),
        M("oop-design", "Object-Oriented Design", "core",
          ["SOLID principles", "Design patterns: the working set", "Refactoring", "Code review practice"],
          [S("Pearson", "Pearson software-design material.")],
          "il_provides: pattern-recognition drills on real codebases and a refactoring kata library with before/after grading rubrics."),
        M("functional-programming", "Functional Programming", "core",
          ["Lambdas and higher-order functions", "Streams and collectors", "Immutability patterns", "Functional error handling"],
          [S("Pearson", "Pearson advanced-language material.")],
          "il_provides: cross-language comparison exercises — the same computation in Python, Java streams, and C++ ranges, so the idea outlives the syntax."),
        M("concurrency-intro", "Concurrency", "core",
          ["Threads and races", "Virtual threads", "Async/await in Python", "Locks and thread-safety"],
          [S("Pearson", "Pearson concurrency material."),
           S("Oracle Education", "1Z0-830 concurrency objectives (incl. virtual threads) as the topic map.")],
          "il_provides: race-condition laboratories where the learner must first produce the bug, then fix it — in a sandbox, never in production."),
        M("testing-debugging", "Testing and Debugging", "core",
          ["Unit testing", "Debugging methodology", "Reading stack traces", "IDE and Git tooling"],
          [S("Pearson", "Pearson tooling material."),
           S("Git", "Official Git documentation for the version-control layer.")],
          "il_provides: a bug zoo — seeded defects across languages with Socratic debugging guidance from Noah, who asks for hypotheses before hints."),
    ]))

PATHS.append(P(
    "il03-pearson-systems", "IL-03",
    "Systems Software: Organization to Software Engineering",
    "Computer organization, operating systems, networks, databases and SQL, software engineering, and the web layer.",
    "foundations", "intermediate", 300, ["systems", "os", "networks", "databases", "pearson"],
    [
        M("computer-organization", "Computer Organization", "core",
          ["Data representation", "Assembly basics", "The memory hierarchy", "Performance and caching"],
          [S("Pearson", "Pearson computer-organization courseware.")],
          "il_provides: the canonical organization node; IL-08's 6.1910 Computation Structures deepens it for the advanced track."),
        M("operating-systems", "Operating Systems", "core",
          ["Processes and threads", "Scheduling", "Memory management", "Filesystems"],
          [S("Pearson", "Pearson operating-systems courseware.")],
          "il_provides: concept simulations (scheduling, paging) plus cross-links to IL-04's Linux administration, where the concepts become commands."),
        M("computer-networks", "Computer Networks", "core",
          ["TCP/IP and the OSI model", "Sockets programming", "HTTP and DNS", "Network debugging tools"],
          [S("Pearson", "Pearson networking courseware.")],
          "il_provides: packet-level laboratories and a sockets project series; cross-links to IL-04's Network+ path for the certification route."),
        M("databases-sql", "Databases and SQL", "core",
          ["The relational model", "SQL: queries, joins, aggregation", "Schema design and normalization", "Transactions and indexes"],
          [S("Pearson", "Pearson database courseware."),
           S("Oracle Education", "Oracle Database SQL (1Z0-071) official objectives as the topic map.")],
          "il_provides: a query gym with a real database and graded query plans; the document-model counterpart lives in IL-07's MongoDB path."),
        M("software-engineering", "Software Engineering", "core",
          ["SDLC models", "Requirements and design", "Testing strategies", "Agile practice"],
          [S("Pearson", "Pearson software-engineering courseware.")],
          "il_provides: a team-simulation project with staged deliverables, code review, and a post-mortem — the process taught by doing it."),
        M("web-fundamentals", "Web Fundamentals", "core",
          ["HTML and CSS", "JavaScript in the browser", "HTTP, REST, JSON", "Frontend/backend connection"],
          [S("Pearson", "Pearson web-development courseware."),
           S("Webucator", "Webucator's full-stack bundle studied as competitive context; its outline is merged here, not duplicated.")],
          "il_provides: the build-a-full-stack-app project arc that Webucator sells as a bundle and Per Scholas runs as a cohort — here as one canonical module with portfolio output."),
        M("api-design", "API Design", "core",
          ["REST design", "Authentication: sessions, tokens, OAuth shapes", "Versioning and contracts", "Documentation"],
          [S("Pearson", "Pearson API material.")],
          "il_provides: contract-first API exercises with automated conformance tests — the learner's API is graded by a client they did not write."),
        M("capstone-build", "Capstone: Full-Stack Build", "capstone",
          ["Project scoping", "Full-stack implementation", "Deployment", "Portfolio presentation"],
          [S("Pearson", "Pearson capstone guidance.")],
          "il_provides: the portfolio artifact itself, reviewed against a public rubric and linked into IL-10's career path as evidence."),
    ]))

PATHS.append(P(
    "il03-mit-ocw", "IL-03",
    "MIT 6-3 Reference Layer",
    "MIT's Course 6-3 curriculum as a reference spine: 6.100A/B, 6.1200, 6.1210, 6.1220, 6.1910, 6.1800/6.1810. Training only — MIT certifies nothing here.",
    "foundations", "intermediate", 240, ["mit", "ocw", "reference", "6-3"],
    [
        M("python-6100ab", "6.100A/B: Python", "core",
          ["6.100A: Introduction to Computer Science Programming in Python", "6.100B: continuation", "Problem sets as the practice spine"],
          [S("MIT OpenCourseWare", "OCW 6.100A/B materials; training only, no certification.")],
          "il_provides: a study schedule and problem-set tracker over the OCW materials, with Noah available for Socratic help on the sets."),
        M("mathcs-61200", "6.1200: Mathematics for Computer Science", "math",
          ["Proofs and induction", "Number theory for CS", "Graph theory", "Probability for computing"],
          [S("MIT OpenCourseWare", "OCW 6.1200/18.062 materials; training only.")],
          "il_provides: the bridge note — where this material overlaps IL-02's discrete module, the platform routes to the single canonical node (no duplicated courses)."),
        M("algorithms-61210-61220", "6.1210/6.1220: Algorithms", "core",
          ["6.1210: Introduction to Algorithms", "6.1220: Design and Analysis of Algorithms", "Sorting, hashing, divide-and-conquer, dynamic programming"],
          [S("MIT OpenCourseWare", "OCW 6.1210/6.1220 materials; training only.")],
          "il_provides: prerequisite gating against IL-02's discrete module, and a single canonical algorithms node shared with IL-03's DSA module."),
        M("compstruct-61910", "6.1910: Computation Structures", "core",
          ["Digital logic to the processor", "Assembly and the machine", "Caches and virtual memory", "The hardware/software interface"],
          [S("MIT OpenCourseWare", "OCW 6.1910 materials; training only.")],
          "il_provides: simulator-based labs for the digital-logic arc, with the honest note that OCW problem sets assume the MIT term structure."),
        M("systems-61800-61810", "6.1800/6.1810: Systems and OS Engineering", "core",
          ["6.1800: Computer Systems Engineering", "6.1810: Operating System Engineering", "Design principles at scale"],
          [S("MIT OpenCourseWare", "OCW 6.1800/6.1810 materials; training only.")],
          "il_provides: a reading guide that sequences the two courses' design papers, with cross-links to IL-04's hands-on Linux administration."),
        M("ml-63900", "6.3900: Introduction to Machine Learning", "core",
          ["ML principles and algorithms", "The prerequisite chain: Python, algorithms, linear algebra, probability", "The on-ramp to IL-07"],
          [S("MIT OpenCourseWare", "OCW 6.3900 materials; training only.")],
          "il_provides: the prerequisite audit — the platform verifies the learner's IL-02 linear-algebra/probability nodes before opening this module, and routes the deep study to IL-07's AI spine."),
    ]))

# ============================================================ IL-04: Systems
PATHS.append(P(
    "il04-linux", "IL-04",
    "Linux Foundations to RHCSA",
    "Linux from first principles through the RHCSA EX200 performance exam, with the LPIC track as the vendor-neutral companion.",
    "certification", "intermediate", 260, ["linux", "rhcsa", "lpic", "sysadmin"],
    [
        M("linux-first-principles", "Linux First Principles", "core",
          ["The filesystem hierarchy", "Permissions and ownership", "Pipes, redirection, text processing", "The shell as an instrument"],
          [S("Linux Professional Institute", "Linux Essentials objectives: the entry vocabulary.")],
          "il_provides: a terminal-first pedagogy — every concept is a command before it is a paragraph, in sandboxed terminals."),
        M("shell-scripting", "Shell Scripting", "core",
          ["Bash scripting", "Automation patterns", "Error handling", "Cron and scheduling"],
          [S("Linux Professional Institute", "LPIC-1 shell and scripting objectives.")],
          "il_provides: an automation kata library: the learner automates real administration tasks, graded by outcome in the sandbox."),
        M("system-administration", "System Administration", "core",
          ["Users, groups, and ACLs", "systemd services", "Storage: partitions, LVM, Stratis", "Networking and firewalls"],
          [S("Linux Professional Institute", "LPIC-1 administration objectives."),
           S("Red Hat Training", "RHCSA EX200 official objectives as the topic map.")],
          "il_provides: scenario labs modeled on the EX200's performance format — the learner is graded on system state, not multiple choice."),
        M("lpic-track", "LPIC-1 and LPIC-2", "exam_prep",
          ["101-500 and 102-500", "201-450 and 202-450", "Exam-day logistics", "Objective-by-objective readiness"],
          [S("Linux Professional Institute", "Official LPIC objectives and topic weightings from lpi.org.")],
          "il_provides: the readiness dashboard per objective, with the honest note that LPI pricing is country-specific and unverified here."),
        M("rhcsa-ex200-prep", "RHCSA EX200 Exam Prep", "exam_prep",
          ["SELinux contexts", "Containers on RHEL", "Storage: Btrfs, VDO", "Troubleshooting under time"],
          [S("Red Hat Training", "RHCSA EX200 official objectives from redhat.com; exam is hands-on, RHEL 10 based.")],
          "il_provides: full-length performance simulations — timed, hands-on, graded on the resulting system state, with a debrief that maps every miss to its objective."),
    ]))

PATHS.append(P(
    "il04-windows", "IL-04",
    "Windows Systems Administration",
    "Windows Server and desktop administration: identity, policy, storage, and PowerShell automation.",
    "foundations", "intermediate", 180, ["windows", "sysadmin", "powershell", "active-directory"],
    [
        M("windows-core", "Windows Core Administration", "core",
          ["Installation and roles", "NTFS permissions", "Services and the registry", "Event logs and diagnostics"],
          [S("Microsoft Learn", "Windows Server documentation; consult Microsoft Learn for current exam pages.")],
          "il_provides: lab scenarios in the Windows admin tradition, with the honest note that Microsoft's role-based exams change faster than any static curriculum."),
        M("active-directory", "Identity: Active Directory", "core",
          ["Forests, domains, OUs", "Group Policy", "Authentication: Kerberos and NTLM", "Hybrid identity concepts"],
          [S("Microsoft Learn", "Active Directory and Entra ID documentation.")],
          "il_provides: a virtual forest the learner builds, breaks, and repairs — identity learned by administering it."),
        M("powershell-automation", "PowerShell Automation", "core",
          ["The pipeline", "Remoting", "Desired State Configuration concepts", "Script modules"],
          [S("Microsoft Learn", "PowerShell documentation.")],
          "il_provides: an automation kata library parallel to the Linux shell track, so the learner sees administration as one discipline in two dialects."),
        M("windows-networking", "Windows Networking Services", "core",
          ["DNS and DHCP on Windows", "File and print services", "Remote access", "Troubleshooting methodology"],
          [S("Microsoft Learn", "Windows networking documentation.")],
          "il_provides: cross-links to IL-04's Network+ path — one networking discipline, two operating systems."),
    ]))

PATHS.append(P(
    "il04-networking", "IL-04",
    "Networking Core: Network+",
    "The Network+ N10-009 core with Wireshark-level packet literacy.",
    "certification", "intermediate", 200, ["networking", "network-plus", "tcp-ip"],
    [
        M("network-models", "Models and Addressing", "core",
          ["OSI and TCP/IP models", "IPv4 and IPv6 addressing", "Subnetting", "VLSM and summarization"],
          [S("CompTIA", "Network+ N10-009 official objectives: Networking Concepts 23%.")],
          "il_provides: subnetting fluency drills to automaticity — the skill the exam punishes most when it is slow."),
        M("network-implementation", "Implementation", "core",
          ["Switching and VLANs", "Routing protocols", "Wireless standards", "Network appliances"],
          [S("CompTIA", "Network+ N10-009 objectives: Implementation 20%, Operations 19%.")],
          "il_provides: topology-building labs where the learner configures the network, then captures and explains its traffic."),
        M("network-security-ops", "Security and Operations", "core",
          ["Network security concepts 14%", "Monitoring and metrics", "The 6-step troubleshooting methodology", "Wireshark analysis"],
          [S("CompTIA", "Network+ N10-009 objectives: Security 14%, Troubleshooting 24%.")],
          "il_provides: the 6-step troubleshooting methodology as a shared concept node across the university — learned here, reused in A+, Server+, and Linux+."),
        M("networkplus-prep", "Network+ N10-009 Exam Prep", "exam_prep",
          ["Performance-based questions", "Objective-by-objective readiness", "Exam-day logistics", "The PBQ drill set"],
          [S("CompTIA", "Official Network+ objectives and exam information from comptia.org.")],
          "il_provides: PBQ-style performance items and a readiness gate; the exam itself is booked through CompTIA's own portal — orchestrated, never cloned."),
    ],
    [A("il04-networking-diagnostic", "Networking Placement Diagnostic", "diagnostic", 0, 0,
       [I("How many usable host addresses does a /26 IPv4 subnet provide?",
          ["30", "62", "64", "126"], 1,
          "A /26 leaves 6 host bits: 2^6 - 2 = 62 usable addresses.", "subnetting"),
        I("Which device forwards frames based on MAC addresses?",
          ["Router", "Hub", "Switch", "Firewall"], 2,
          "Switches learn MAC addresses and forward frames at Layer 2.", "switching"),
        I("DNS primarily resolves ___.",
          ["IP addresses to MAC addresses", "domain names to IP addresses", "ports to services", "URLs to cookies"],
          1, "DNS maps human-readable domain names to IP addresses.", "dns"),
        I("In the OSI model, TCP operates at ___.",
          ["Layer 2", "Layer 3", "Layer 4", "Layer 7"], 2,
          "TCP is a Layer 4 (Transport) protocol.", "osi"),
        I("A VLAN primarily provides ___.",
          ["faster cabling", "logical broadcast-domain segmentation", "wireless encryption", "power over ethernet"],
          1, "VLANs segment a switch into multiple logical broadcast domains.", "vlans")])]))

PATHS.append(P(
    "il04-rhce", "IL-04",
    "RHCE: Ansible Automation",
    "Red Hat Certified Engineer EX294: Ansible automation on RHEL. Current RHCSA required.",
    "certification", "advanced", 100, ["rhce", "ansible", "automation"],
    [
        M("ansible-foundations", "Ansible Foundations", "core",
          ["Inventory and patterns", "Playbooks and plays", "Variables and facts", "Idempotence as a discipline"],
          [S("Ansible Documentation", "Official Ansible docs: the complete reference.")],
          "il_provides: idempotence drills — the learner's playbook must converge from any starting state, verified by the lab harness."),
        M("ex294-ansible-prep", "EX294 Exam Prep", "exam_prep",
          ["Roles and Galaxy", "System roles", "Automation controller concepts", "Timed performance scenarios"],
          [S("Red Hat Training", "RHCE EX294 program description from redhat.com; current RHCSA is the prerequisite."),
           S("Ansible Documentation", "Official docs as the task reference.")],
          "il_provides: full-length EX294-style performance scenarios — hands-on, timed, graded on managed-node state. The exam is booked through Red Hat; the platform prepares."),
    ]))

# ============================================================ IL-05: Cloud/DevOps
PATHS.append(P(
    "il05-kodekloud", "IL-05",
    "DevOps at KodeKloud Parity",
    "The seven-role DevOps map — System Administrator, Kubernetes Administrator, SRE, Kubernetes Developer, DevOps Engineer, Platform Engineer, Cloud Engineer — as one canonical path.",
    "career", "intermediate", 300, ["devops", "sre", "platform", "kodekloud"],
    [
        M("devops-role-map", "The Seven Roles", "career",
          ["Role definitions and boundaries", "The DevOps path sequence", "Milestone projects per role", "Interview preparation"],
          [S("KodeKloud", "KodeKloud's role-based learning paths and DevOps sequence as the parity baseline."),
           S("Per Scholas", "Per Scholas Cloud DevOps (14 weeks) studied as competitive context; merged into this canonical path.")],
          "il_provides: the single canonical DevOps role map for the university — KodeKloud's paths and Per Scholas's cohort are both studied, neither is duplicated. The platform adds milestone projects graded against production-like rubrics."),
        M("linux-shell-git", "Linux, Shell, Git", "core",
          ["Linux administration for DevOps", "Shell scripting", "Git and GitHub workflows", "Golang/Python for tooling"],
          [S("KodeKloud", "The DevOps prerequisites layer: Linux, shell, scripting languages."),
           S("Git", "Official Git documentation.")],
          "il_provides: cross-links to IL-04's Linux path — one Linux discipline, referenced not repeated."),
        M("git-github", "Git and GitHub", "core",
          ["Branching strategies", "Pull requests and review", "GitHub Actions basics", "Monorepo vs. polyrepo"],
          [S("Git", "Official Git documentation.")],
          "il_provides: a simulated team repository where the learner's branching discipline is reviewed like production code."),
        M("containers-docker", "Containers: Docker", "core",
          ["Images and layers", "The Dockerfile", "Registries", "Multi-stage builds"],
          [S("Docker", "Docker's official documentation and getting-started material."),
           S("KodeKloud", "KodeKloud's container labs as the parity reference.")],
          "il_provides: image-hardening labs — the learner's image is scanned, and the vulnerabilities are theirs to fix."),
        M("cicd-jenkins", "CI/CD: Jenkins and Pipelines", "core",
          ["Pipeline as code", "Jenkins agents and stages", "Artifact management", "Security scanning gates"],
          [S("Jenkins", "Official Jenkins documentation: pipelines, agents, administration.")],
          "il_provides: a pipeline the learner builds, breaks, and secures — with the CI gates from the university's own release discipline as the example."),
        M("k8s-foundations", "Kubernetes Foundations", "core",
          ["Pods, services, deployments", "ConfigMaps and secrets", "Ingress", "Helm basics"],
          [S("Kubernetes Documentation", "Official Kubernetes concepts and task documentation.")],
          "il_provides: the on-ramp to the full CNCF stack in il05-cloud-native — this module teaches operation, that path certifies it."),
        M("ansible-config", "Ansible Configuration Management", "core",
          ["Playbooks for fleet state", "Roles", "Vault and secrets", "Idempotent operations"],
          [S("Ansible Documentation", "Official Ansible docs.")],
          "il_provides: cross-links to IL-04's RHCE path — one Ansible discipline, two destinations."),
        M("observability", "Observability: Prometheus and Grafana", "core",
          ["Metrics and PromQL", "Alerting", "Dashboards", "Loki log aggregation"],
          [S("Prometheus", "Official Prometheus documentation."),
           S("Grafana", "Official Grafana and Loki documentation.")],
          "il_provides: an instrumented demo fleet with a real incident to diagnose — the learner's first on-call, supervised."),
    ],
    [A("il05-devops-diagnostic", "DevOps Placement Diagnostic", "diagnostic", 0, 0,
       [I("In Git, which command creates a new branch and switches to it?",
          ["git branch new", "git checkout -b new", "git switch", "git new-branch"], 1,
          "git checkout -b <name> creates and switches in one step (git switch -c is the modern equivalent).", "git"),
        I("A Dockerfile instruction that is cached per layer is ___.",
          ["CMD", "RUN", "EXPOSE", "LABEL"], 1,
          "Each RUN creates a layer; Docker caches layers to speed rebuilds.", "docker"),
        I("In Kubernetes, a Deployment manages ___.",
          ["nodes", "replica sets and pods", "storage classes", "ingress controllers"], 1,
          "Deployments manage ReplicaSets, which manage pods — the standard workload abstraction.", "kubernetes"),
        I("Idempotence in Ansible means ___.",
          ["the playbook runs fast", "repeated runs converge to the same state", "tasks run in parallel", "vault is encrypted"],
          1, "An idempotent playbook produces the same end state no matter how many times it runs.", "ansible"),
        I("PromQL is the query language for ___.",
          ["Grafana Loki", "Prometheus", "Jenkins", "Terraform"], 1,
          "PromQL queries Prometheus metrics; LogQL queries Loki logs.", "observability")])]))

PATHS.append(P(
    "il05-cloud-native", "IL-05",
    "Cloud-Native: The Kubernetes Certification Stack",
    "KCNA through CKA, CKAD, CKS, and KCSA — the CNCF stack with the Linux Foundation's own program as the exam route.",
    "certification", "advanced", 260, ["kubernetes", "cncf", "cka", "cks"],
    [
        M("kcna-foundations", "KCNA: Cloud-Native Foundations", "exam_prep",
          ["Kubernetes architecture", "Cloud-native principles", "GitOps concepts", "Observability basics"],
          [S("CNCF", "The CNCF Kubernetes certification program: KCNA as the entry point."),
           S("Linux Foundation Training", "Linux Foundation training and exam portal.")],
          "il_provides: the readiness map per KCNA domain with lab verification for every claim of competence."),
        M("cka-prep", "CKA: Certified Kubernetes Administrator", "exam_prep",
          ["Cluster architecture and etcd", "Workloads and scheduling", "Services and networking", "Storage, troubleshooting"],
          [S("Kubernetes Documentation", "Official Kubernetes docs: the CKA's working reference."),
           S("CNCF", "CNCF CKA program information."),
           S("Linux Foundation Training", "Exam booking through the Linux Foundation portal.")],
          "il_provides: performance-style task drills under time — the CKA is hands-on, so preparation is hands-on. killer.sh-style intensity, original tasks."),
        M("ckad-prep", "CKAD: Certified Kubernetes Application Developer", "exam_prep",
          ["Application design", "Deployment configuration", "Observability for developers", "Services and networking for apps"],
          [S("Kubernetes Documentation", "Official Kubernetes docs."),
           S("CNCF", "CNCF CKAD program information.")],
          "il_provides: developer-workflow drills — the learner ships, debugs, and observes real workloads against the clock."),
        M("cks-prep", "CKS: Certified Kubernetes Security Specialist", "exam_prep",
          ["Cluster hardening", "System hardening", "Supply-chain security", "Runtime security: Falco, seccomp, AppArmor"],
          [S("Kubernetes Documentation", "Official Kubernetes security documentation."),
           S("CNCF", "CNCF CKS program information; CKA is the prerequisite.")],
          "il_provides: adversarial labs — the learner hardens a cluster, then attacks a peer's, then writes the incident report."),
        M("kcsa-prep", "KCSA: Kubernetes and Cloud Security Associate", "exam_prep",
          ["Cloud-native security overview", "Kubernetes security fundamentals", "The exam's domain map"],
          [S("CNCF", "CNCF KCSA program information."),
           S("Linux Foundation Training", "Exam booking through the Linux Foundation portal.")],
          "il_provides: the security-vocabulary layer that makes the CKS deep dives legible — positioned honestly as associate-level."),
    ]))

PATHS.append(P(
    "il05-zero-trust", "IL-05",
    "Zero-Trust Platform Architecture",
    "NIST SP 800-207 as the architecture: tenets, logical components, and deployment models for the enterprise.",
    "foundations", "intermediate", 160, ["zero-trust", "nist", "architecture", "security"],
    [
        M("sp800-207-tenets", "SP 800-207: Tenets and Components", "core",
          ["The seven tenets", "Policy engine, policy administrator, policy enforcement point", "Control plane vs. data plane", "Trust algorithm"],
          [S("NIST Zero Trust Architecture (SP 800-207)", "The canonical publication: tenets, components, deployment models.")],
          "il_provides: architecture-decision exercises — the learner places PEPs and writes policy for a fictional enterprise, graded on tenet fidelity."),
        M("identity-pillar", "Identity as the Perimeter", "core",
          ["Phishing-resistant MFA", "Device posture", "Continuous authentication", "Privileged access"],
          [S("NIST Zero Trust Architecture (SP 800-207)", "Identity-centric tenets and access decisions.")],
          "il_provides: a lab identity fabric where the learner implements step-up authentication and watches the policy engine decide."),
        M("microsegmentation", "Microsegmentation and Network Pillar", "core",
          ["Segmentation strategies", "Software-defined perimeters", "East-west traffic inspection", "Encrypted everything"],
          [S("NIST Zero Trust Architecture (SP 800-207)", "Network-focused deployment models.")],
          "il_provides: a segmented lab network the learner must traverse as an attacker would — then re-architect so the path closes."),
        M("zt-deployment-models", "Deployment Models and Migration", "core",
          ["Device agent/gateway, enclave, resource portal models", "Migration from perimeter security", "Maturity steps", "Measuring zero-trust"],
          [S("NIST Zero Trust Architecture (SP 800-207)", "Deployment models and use cases.")],
          "il_provides: the migration-plan capstone: a brownfield enterprise, a phased zero-trust roadmap, and a review board that asks hard questions."),
    ]))

PATHS.append(P(
    "il05-terraform", "IL-05",
    "Terraform: Infrastructure as Code",
    "HCL, state, and modules through the HashiCorp Certified: Terraform Associate exam.",
    "certification", "intermediate", 190, ["terraform", "iac", "hashicorp"],
    [
        M("hcl-foundations", "HCL and Core Workflow", "core",
          ["Resources and providers", "Variables and outputs", "The plan/apply cycle", "State fundamentals"],
          [S("Terraform Documentation", "Official Terraform docs: the complete reference.")],
          "il_provides: a sandbox cloud account where every plan is reviewed before apply — the workflow taught as a discipline, not a command."),
        M("state-modules", "State and Modules", "core",
          ["Remote state and locking", "Module composition", "Workspaces", "Import and refactoring"],
          [S("Terraform Documentation", "Official docs: state and module composition.")],
          "il_provides: state-surgery labs — the learner recovers corrupted state the way production engineers do, in a safe copy."),
        M("terraform-associate-prep", "Terraform Associate Exam Prep", "exam_prep",
          ["IaC concepts", "Terraform basics and workflow", "Advanced features", "Exam-day logistics"],
          [S("Terraform Documentation", "Official docs as the exam's reference."),
           S("KodeKloud", "KodeKloud's Terraform course as the parity reference for lab style.")],
          "il_provides: scenario-based readiness checks per exam domain; the exam is booked through HashiCorp's own portal."),
    ]))

# ============================================================ IL-06: Security
PATHS.append(P(
    "il06-hackers-arise", "IL-06",
    "The Hackers-Arise Spine",
    "OccupyTheWeb's curriculum cross-mapped against HTB, THM, OffSec, PortSwigger, SANS, CompTIA, and KodeKloud. Gaps become original Interstitium modules. NICE-aligned.",
    "career", "intermediate", 380, ["offensive", "hackers-arise", "nice", "pentest"],
    [
        M("linux-for-hackers", "Linux for Hackers", "core",
          ["The hacker-oriented Linux curriculum", "Bash for operations", "Text processing at speed", "Where HTB/THM assume this knowledge"],
          [S("Hackers-Arise", "The Hackers-Arise Linux categories: the topic spine being cross-mapped."),
           S("TryHackMe", "THM Linux rooms as the lab counterpart.")],
          "il_provides: the cross-map itself — every Hackers-Arise Linux topic annotated with where HTB, THM, and PEN-200 cover it, and what only IL teaches."),
        M("network-basics-exploitation", "Network Basics and Exploitation", "core",
          ["TCP/IP for attackers", "Network reconnaissance", "Vulnerability scanning", "The exploitation workflow"],
          [S("Hackers-Arise", "Network Basics/Exploitation, Vulnerability Scanning, Vulnerabilities & Exploits categories.")],
          "il_provides: original lab scenarios for the scanning-to-exploitation chain, built in the IL lab format rather than cloned from any vendor."),
        M("osint-recon", "OSINT and Reconnaissance", "lab",
          ["Passive reconnaissance", "Active reconnaissance", "OSINT tradecraft", "Documentation discipline"],
          [S("Hackers-Arise", "OSINT & Reconnaissance category.")],
          "il_provides: an original OSINT capstone on a fictional target — all technique, no real persons, with a legal/ethics gate before the module opens."),
        M("password-attacks", "Password Cracking", "lab",
          ["Hash identification", "Wordlists and rules", "Cracking rigs and time estimation", "Credential hygiene for defenders"],
          [S("Hackers-Arise", "Password Cracking category.")],
          "il_provides: time-estimation mathematics and defender-side lessons; the cracking itself happens in the isolated lab, against the learner's own hashes."),
        M("wifi-hacking", "Wi-Fi Hacking", "lab",
          ["802.11 fundamentals", "Capture and analysis", "WPA handshake attacks", "Defensive countermeasures"],
          [S("Hackers-Arise", "Wi-Fi Hacking category.")],
          "il_provides: the legal boundary taught first — lab-only hardware, the learner's own access point, and the defender's view of every attack."),
        M("web-app-exploitation", "Web Application Exploitation", "lab",
          ["Burp Suite methodology", "Injection flaws", "Authentication attacks", "The PortSwigger overlap map"],
          [S("Hackers-Arise", "Web Application Exploitation category."),
           S("PortSwigger Web Security Academy", "Free labs; the overlap map shows what PortSwigger covers vs. what IL adds.")],
          "il_provides: the dedupe artifact made visible — what PortSwigger teaches is linked, what it doesn't is authored here."),
        M("forensics-hackers", "Forensics for Hackers", "lab",
          ["Disk and memory forensics", "Timeline analysis", "Anti-forensics awareness", "The IN-category bridge"],
          [S("Hackers-Arise", "Forensics for Hackers category."),
           S("NIST NICE Framework (SP 800-181 Rev.1)", "Digital Forensics (PD) and Digital Evidence Analysis (IN).")],
          "il_provides: forensics taught from the attacker's artifacts — the learner generates the evidence, then analyzes it."),
        M("scada-ics-satellite", "SCADA/ICS and Satellite Hacking", "core",
          ["OT protocols: Modbus, DNP3", "ICS attack surface", "Satellite communications basics", "Safety-critical ethics"],
          [S("Hackers-Arise", "SCADA/ICS Hacking and Satellite Hacking categories.")],
          "il_provides: original survey material with the safety ethics front-loaded — OT attacks are taught as defensive knowledge with a hard ethics gate."),
        M("nice-framework-map", "NICE Framework Alignment", "career",
          ["OG: Oversight and Governance (17 roles)", "DD: Design and Development (9)", "IO: Implementation and Operation (7)", "PD: Protection and Defense (7)", "IN: Investigation (2)"],
          [S("NIST NICE Framework (SP 800-181 Rev.1)", "The official framework: five categories, 42 work roles — never the superseded 7-category model.")],
          "il_provides: the career map — every IL-06 module tagged to NICE work roles by name, with honest notes on which roles need clearances or degrees the platform cannot grant."),
    ],
    [A("il06-offensive-diagnostic", "Offensive Security Placement Diagnostic", "diagnostic", 0, 0,
       [I("In TCP, the three-way handshake sequence is ___.",
          ["SYN, SYN-ACK, ACK", "ACK, SYN, FIN", "SYN, ACK, PSH", "RST, SYN, ACK"], 0,
          "SYN -> SYN-ACK -> ACK establishes the connection; half-open scans exploit the middle state.", "networking"),
        I("A /etc/shadow entry beginning with $6$ indicates ___.",
          ["DES hashing", "MD5 hashing", "SHA-512 crypt", "bcrypt"], 2,
          "$6$ denotes SHA-512 crypt in the modular crypt format.", "password-attacks"),
        I("Which NICE category contains Digital Forensics?",
          ["OG", "DD", "PD", "IN"], 2,
          "Digital Forensics sits in PD (Protection and Defense); Digital Evidence Analysis sits in IN.", "nice"),
        I("In the OWASP Top 10, broken access control most directly enables ___.",
          ["DDoS", "unauthorized data access and privilege escalation", "phishing", "supply-chain attacks"],
          1, "Broken access control lets attackers act outside their intended permissions.", "web"),
        I("The primary legal boundary for all IL-06 labs is ___.",
          ["speed", "explicit authorization and isolated lab scope", "anonymity", "tool choice"],
          1, "Every offensive technique is gated on authorization and lab-only scope. No exceptions.", "ethics")])]))

PATHS.append(P(
    "il06-offensive", "IL-06",
    "Offensive Operations: HTB, THM, OffSec",
    "The penetration-testing track: HTB/THM labs, the PEN-200/OSCP map, and PortSwigger's web academy — with IL-authored gap modules.",
    "career", "advanced", 300, ["pentest", "oscp", "red-team", "htb", "thm"],
    [
        M("htb-thm-labs", "HTB and THM Lab Operations", "lab",
          ["Machine methodology", "Enumeration discipline", "Privilege escalation patterns", "Documentation and reporting"],
          [S("HackTheBox", "HTB machines and labs; subscription via HTB's own portal."),
           S("TryHackMe", "THM guided rooms and paths.")],
          "il_provides: the methodology layer — enumeration checklists, escalation pattern catalogs, and report templates. The machines belong to HTB/THM; the method is Interstitium's."),
        M("pen200-oscp-map", "PEN-200 and the OSCP Map", "exam_prep",
          ["The 'try harder' methodology", "Buffer overflows", "Active Directory attacks", "The 24-hour exam: logistics and stamina"],
          [S("OffSec", "PEN-200 course and OSCP exam via OffSec's own portal.")],
          "il_provides: an honest readiness audit — AD lab scenarios and buffer-overflow drills that tell the learner whether they are ready before they pay for the exam."),
        M("web-app-exploitation", "Advanced Web Exploitation", "lab",
          ["SQLi to RCE chains", "SSRF and cloud metadata", "Deserialization", "Race conditions"],
          [S("PortSwigger Web Security Academy", "Free PortSwigger labs; the canonical web-exploitation curriculum.")],
          "il_provides: chained-scenario labs that PortSwigger's per-vulnerability labs don't cover — the attack as a campaign, not a checklist."),
        M("ad-attack-chains", "Active Directory Attack Chains", "lab",
          ["Kerberoasting and AS-REP roasting", "BloodHound methodology", "Lateral movement", "Domain dominance and persistence"],
          [S("HackTheBox", "HTB AD-focused machines as practice ground.")],
          "il_provides: a purpose-built AD lab forest with a guided attack-chain curriculum — the single most employable offensive skill, taught end to end."),
        M("ctf-tiers", "CTF: The T0-T3 Challenge Architecture", "lab",
          ["T0: guided warmups", "T1: single-technique challenges", "T2: chained scenarios", "T3: original research-grade problems"],
          [S("HackTheBox", "HTB's challenge formats as the genre reference."),
           S("TryHackMe", "THM's challenge rooms as the genre reference.")],
          "il_provides: the tier architecture itself — original IL challenges at every tier, so the learner always has a next step that belongs to this platform."),
        M("report-writing", "Reporting and Professional Practice", "career",
          ["Finding write-ups", "Risk rating", "Executive summaries", "Retest verification"],
          [S("OffSec", "OffSec's reporting standards as the professional reference.")],
          "il_provides: a report-review service with a public rubric — findings graded the way client reports are graded."),
    ]))

PATHS.append(P(
    "il06-defensive", "IL-06",
    "Defensive Operations: SOC to Incident Response",
    "The blue-team track: SOC operations, threat hunting, forensics, and incident response at SANS depth.",
    "career", "intermediate", 180, ["blue-team", "soc", "forensics", "incident-response"],
    [
        M("soc-operations", "SOC Operations", "core",
          ["Alert triage (L1)", "Investigation and correlation (L2)", "Threat hunting (L3)", "Detection engineering"],
          [S("SANS Institute", "SANS blue-team depth as the reference standard."),
           S("TryHackMe", "THM defensive rooms for hands-on practice.")],
          "il_provides: a simulated SOC with a live alert queue — the learner triages, escalates, and hunts against the clock, mentored by playbooks."),
        M("forensics-ir", "Forensics and Incident Response", "lab",
          ["Disk, memory, and network forensics", "The IR lifecycle: detect to lessons-learned", "Chain of custody", "Timeline analysis"],
          [S("SANS Institute", "SANS FOR508-style depth as the reference."),
           S("NIST NICE Framework (SP 800-181 Rev.1)", "Incident Response and Digital Forensics (PD) work roles.")],
          "il_provides: original forensic images with planted intrusions — the learner builds the timeline that convicts the (fictional) intruder."),
        M("detection-engineering", "Detection Engineering", "core",
          ["Sigma rules", "Log sources and normalization", "Tuning and false positives", "Threat-informed defense"],
          [S("SANS Institute", "Detection-engineering practice as the reference.")],
          "il_provides: a detection lab where the learner's rules face a live adversary simulation — precision and recall scored honestly."),
        M("security-plus-bridge", "Security+ Bridge", "exam_prep",
          ["SY0-701 domains (V7 current; V8 ~Nov 2026)", "The defensive vocabulary", "Readiness gate"],
          [S("CompTIA", "Security+ official objectives from comptia.org.")],
          "il_provides: the readiness gate and PBQ drills; the exam is booked through CompTIA. Cross-linked, not duplicated, with IL-09's Security+ module."),
    ]))

PATHS.append(P(
    "il06-fde-interface", "IL-06",
    "The Forward-Deployed Interface",
    "Security engineering at the customer boundary: the Interview Kickstart FDE spine, MIT xPRO Cybersecurity, and ELVTR's AI-aided security course.",
    "career", "advanced", 120, ["fde", "security-engineering", "ai-security"],
    [
        M("ik-fde-spine", "Interview Kickstart: FDE Spine", "career",
          ["The FDE role: engineer at the customer", "AI Engineering spine (weeks 1-11)", "The FDE spine", "Interview preparation"],
          [S("Interview Kickstart FDE", "The official FDE program page; enrollment is external.")],
          "il_provides: the preparation layer — system-design reps, customer-scenario drills, and the honest note that the credential is Interview Kickstart's, not ours."),
        M("mitxpro-cybersecurity", "MIT xPRO Cybersecurity", "exam_prep",
          ["The 24-week professional certificate", "36 CEUs; pass/fail at 75%", "Curriculum-mapped preparation"],
          [S("MIT xPRO Cybersecurity", "The official course page: 24 weeks, 36 CEUs."),
           S("MIT xPRO", "MIT xPRO's professional-education portal.")],
          "il_provides: a preparation track mapped to the published curriculum — every week has a readiness check, so the learner enters the $7,750 program ready. The certificate is MIT xPRO's."),
        M("elvtr-ai-cybersecurity", "ELVTR: AI-Aided Cybersecurity", "core",
          ["AI in the SOC", "AI-assisted threat hunting", "The practitioner-led format", "Live-course preparation"],
          [S("ELVTR", "ELVTR's live-course catalog; enrollment is external.")],
          "il_provides: the on-ramp — AI/ML literacy at the level the live course assumes, so the learner arrives able to contribute from week one."),
        M("secure-engineering", "Secure Engineering Practice", "core",
          ["Threat modeling", "Secure defaults", "Security review", "Shipping safely at the boundary"],
          [S("NIST NICE Framework (SP 800-181 Rev.1)", "Secure Software Development and Security Architecture (DD).")],
          "il_provides: the FDE security playbook — threat models and review checklists for engineers who ship inside customer environments."),
    ]))

# ============================================================ IL-07: Data & AI
PATHS.append(P(
    "il07-mongodb", "IL-07",
    "Document Databases: MongoDB University",
    "The official MongoDB University path: Atlas, the document model, aggregation, and data modeling — free, hands-on, career-ready.",
    "foundations", "intermediate", 120, ["mongodb", "nosql", "databases"],
    [
        M("atlas-foundations", "Atlas Foundations", "core",
          ["Getting Started with MongoDB Atlas", "Clusters and the free tier", "Data Explorer", "Connection and drivers"],
          [S("MongoDB University", "learn.mongodb.com: free official courses and learning paths."),
           S("MongoDB Introduction Learning Path", "The official beginner learning path.")],
          "il_provides: a study schedule with readiness checks per unit and a local-vs-Atlas decision guide — the courses are MongoDB's, the pacing is Interstitium's."),
        M("document-model", "The Document Model", "core",
          ["Documents, collections, databases", "Value types and identifiers", "Flexible schema", "Schema validation"],
          [S("MongoDB University", "The document-model units on learn.mongodb.com.")],
          "il_provides: schema-design exercises graded against query patterns — the learner feels why embedding vs. referencing matters."),
        M("aggregation-framework", "The Aggregation Framework", "core",
          ["Pipeline stages", "$match, $group, $project, $lookup", "Accumulators and expressions", "Performance awareness"],
          [S("MongoDB University", "The aggregation units on learn.mongodb.com.")],
          "il_provides: a pipeline gym — real datasets, staged pipeline problems, and explain-plan reading so performance is learned early."),
        M("data-modeling", "Data Modeling", "core",
          ["Relationship modeling", "Patterns: embedding vs. referencing", "Indexing for query patterns", "The modeling capstone"],
          [S("MongoDB University", "The data-modeling units on learn.mongodb.com.")],
          "il_provides: the modeling review board — the learner defends a schema against a workload, the way production reviews actually run."),
        M("python-mongodb", "MongoDB for Python Developers", "lab",
          ["PyMongo", "ODM patterns", "Transactions", "The application capstone"],
          [S("MongoDB University", "The Python-developer units on learn.mongodb.com.")],
          "il_provides: the application capstone that connects this path to IL-03's Python modules — one database discipline, used from the learner's own code."),
    ]))

PATHS.append(P(
    "il07-data-schools", "IL-07",
    "The Data-School Spine: MIT, Stanford, CMU",
    "Data analyst, data engineering, databases, warehousing, and big data — distilled from the MIT, Stanford, and CMU data programs, with the professional credentials mapped honestly.",
    "career", "intermediate", 220, ["data-engineering", "analytics", "databases", "big-data"],
    [
        M("data-analyst-track", "Data Analyst Track", "career",
          ["SQL fluency", "Visualization and reporting", "Statistics for analysts", "The analyst portfolio"],
          [S("Stanford Online", "Stanford's data-science professional offerings as reference.")],
          "il_provides: the analyst portfolio track — every module ends in a presentable artifact, because analysts are hired on evidence."),
        M("data-engineering-track", "Data Engineering Track", "career",
          ["Pipelines and orchestration", "Warehousing: dimensional modeling", "Batch and streaming", "Data quality and governance"],
          [S("MIT xPRO", "MIT xPRO Professional Certificate in Data Engineering as the external credential reference.")],
          "il_provides: a pipeline capstone on real-scale data with data-quality gates — the warehouse is built, loaded, and defended."),
        M("databases-deep", "Databases Deep", "core",
          ["Relational internals", "6.5830/6.5831 lineage", "Indexing and query planning", "Transactions and isolation"],
          [S("MIT OpenCourseWare", "MIT database-systems lineage as reference.")],
          "il_provides: the internals layer — B-trees and query planners taught with visualizations, cross-linked to IL-03's SQL module without duplication."),
        M("big-data-systems", "Big Data Systems", "core",
          ["Distributed processing", "The Hadoop/Spark lineage", "Mining massive datasets", "Cost and scale reasoning"],
          [S("Stanford Online", "Stanford's Mining Massive Data Sets graduate certificate as reference.")],
          "il_provides: scale-reasoning exercises — the learner prices and sizes architectures, because big data is an economic discipline first."),
        M("mit-credentials", "MIT Credentials: xPRO and MicroMasters", "exam_prep",
          ["xPRO Data Engineering ($7,900)", "xPRO Advanced Analytics ($7,550, 36 CEUs)", "MicroMasters SDS: the graduate spine", "Preparation mapping"],
          [S("MIT xPRO", "MIT xPRO's professional-education portal."),
           S("MIT xPRO Advanced Analytics", "The Advanced Analytics professional certificate page."),
           S("MIT MicroMasters Statistics & Data Science", "The MicroMasters SDS credential: four graduate courses plus proctored capstone.")],
          "il_provides: the preparation map — which IL modules cover which credential's prerequisites, with readiness gates before the learner spends a dollar. Never implies MIT endorsement."),
        M("stanford-credentials", "Stanford Credentials", "exam_prep",
          ["Data Mining & Applications graduate certificate", "Mining Massive Data Sets graduate certificate", "Databases graduate certificate", "Preparation mapping"],
          [S("Stanford Online", "Stanford Online's certificate catalog; exact course menus unverified — consult Stanford.")],
          "il_provides: the preparation map with the same honesty contract: preparation here, credential there, no implied partnership."),
    ]))

PATHS.append(P(
    "il07-ai-ml", "IL-07",
    "Machine Learning and LLM Engineering",
    "The Stanford arc — CS229, CS230, CS224N, CS231N, CS234 — into MLOps and LLM engineering. PyTorch primary, honesty throughout.",
    "foundations", "advanced", 260, ["ml", "deep-learning", "nlp", "llm", "mlops"],
    [
        M("ml-foundations-cs229", "ML Foundations (CS229 Arc)", "core",
          ["Supervised learning", "Kernels and SVMs", "Bayesian methods", "Learning theory: bias/variance, VC dimension"],
          [S("MIT OpenCourseWare", "The classical-ML lineage as reference."),
           S("PyTorch", "Official PyTorch tutorials as the implementation reference.")],
          "il_provides: the convex-optimization appendix from CS229's own review handouts, and debugging-ML exercises in the CS230 'Structuring ML Projects' spirit."),
        M("deep-learning-cs230", "Deep Learning (CS230 Arc)", "core",
          ["Neural network foundations", "Backprop from scratch in NumPy", "CNNs on CIFAR-10", "Framework fluency: PyTorch primary"],
          [S("PyTorch", "Official PyTorch tutorials: the primary framework reference.")],
          "il_provides: GPU notebook playgrounds and the backprop-from-scratch graded exercise — the CS231N assignment-1 ethos, original problems."),
        M("nlp-cs224n", "NLP to LLMs (CS224N Arc)", "core",
          ["Classical NLP", "Transformers", "Instruction tuning and RLHF", "Tokenization and decoding strategies"],
          [S("Hugging Face LLM Course", "The open LLM course: transformers through fine-tuning and evaluation.")],
          "il_provides: the fine-tuning laboratory — PEFT/LoRA on open models with evaluation harnesses, so the learner measures rather than vibes."),
        M("vision-cs231n", "Vision (CS231N Arc)", "core",
          ["CNN architectures", "Detection and segmentation", "Vision transformers", "Transfer learning"],
          [S("PyTorch", "Official PyTorch vision tutorials.")],
          "il_provides: the vision project arc — from kNN through transfer learning on a real dataset, with honest compute budgets stated up front."),
        M("rl-cs234", "Reinforcement Learning (CS234 Arc)", "core",
          ["MDPs and dynamic programming", "Policy gradients", "Value methods", "The RLHF connection"],
          [S("PyTorch", "Official PyTorch RL references.")],
          "il_provides: the RLHF bridge — how the RL in this module becomes the H in the NLP module's RLHF, taught as one story."),
        M("mlops-production", "MLOps: Production Machine Learning", "core",
          ["Maturity levels 0/1/2", "Experiment tracking", "Deployment and monitoring", "Data and model versioning"],
          [S("Hugging Face LLM Course", "Evaluation and deployment chapters.")],
          "il_provides: the production-readiness checklist and a model-deployment capstone with monitoring — the unglamorous half of ML, taught seriously."),
        M("llm-engineering", "LLM Engineering", "core",
          ["RAG architectures", "Agents and tool use", "Evaluation: MMLU, HELM, HumanEval, RAGAS", "LLMOps"],
          [S("Hugging Face LLM Course", "The open LLM course chapters on adaptation and evaluation."),
           S("Anthropic", "Anthropic's engineering notes on building effective agents (via anthropic.com).")],
          "il_provides: the evaluation-first discipline — every LLM system the learner builds ships with a benchmark harness, because unevaluated AI is astrology."),
    ],
    [A("il07-ml-diagnostic", "ML Readiness Diagnostic", "diagnostic", 0, 0,
       [I("The bias/variance tradeoff states that ___.",
          ["more data always fixes everything", "expected error decomposes into bias, variance, and irreducible noise", "variance is always bad", "bias is always bad"],
          1, "Expected error = bias^2 + variance + irreducible noise; the tradeoff governs model selection.", "learning-theory"),
        I("In backpropagation, gradients flow ___.",
          ["forward through the network", "backward from the loss via the chain rule", "randomly", "only through ReLU units"],
          1, "Backprop applies the chain rule from the loss backward through each layer.", "deep-learning"),
        I("RLHF aligns language models using ___.",
          ["supervised labels only", "human preference comparisons as a reward signal", "larger batch sizes", "more parameters"],
          1, "RLHF trains a reward model on human preferences, then optimizes the policy against it.", "rlhf"),
        I("RAG grounds generation by ___.",
          ["retraining the model", "retrieving relevant documents into the context", "removing attention", "quantizing weights"],
          1, "Retrieval-augmented generation fetches documents at inference time and conditions on them.", "rag"),
        I("A well-constructed ML evaluation needs ___.",
          ["a held-out test set the model never trained on", "the training set reused", "no baseline", "vibes"],
          0, "Held-out evaluation against baselines is the minimum honest practice.", "evaluation")])]))

PATHS.append(P(
    "il07-neuroai", "IL-07",
    "NeuroAI: Brain Principles in Computing",
    "A computing-oriented neuroscience track: neural coding, simulation with NEURON and Brian2, and brain-inspired AI — no medical content.",
    "foundations", "advanced", 120, ["neuroscience", "neuroai", "simulation"],
    [
        M("comp-neuro-foundations", "Computational Neuroscience Fundamentals", "core",
          ["Neural coding: rate vs. spike", "Leaky integrate-and-fire and Hodgkin-Huxley", "Hebbian learning and STDP", "Hopfield networks as the AI bridge"],
          [S("Neuronal Dynamics (EPFL)", "The open text: integrate-and-fire through dendrites, with Python exercises."),
           S("MIT Press", "Dayan & Abbott, Theoretical Neuroscience: the field's standard graduate text, cited as anchor.")],
          "il_provides: the mathematics bridge — every biophysical model is paired with the IL-02 differential-equations and probability nodes it assumes."),
        M("neural-modeling-simulation", "Neural Modeling and Simulation", "lab",
          ["NEURON: compartmental models", "Brian2: spiking networks in Python", "STDP rules in code", "The spiking-network capstone"],
          [S("NEURON Simulator", "The NEURON simulator for detailed biophysical models."),
           S("Brian2", "Brian2 documentation: the flexible spiking-network lab instrument.")],
          "il_provides: the capstone laboratory — build and simulate a small spiking network, compare rate vs. spike coding against an AI baseline."),
        M("neuroai-synthesis", "NeuroAI: Brain Principles in AI", "core",
          ["Transformer attention vs. biological attention: the honest analogy", "Predictive coding and the Bayesian brain", "Spiking neural networks and neuromorphic hardware", "The backprop question: open research, not settled syllabus"],
          [S("Neuronal Dynamics (EPFL)", "The open text's later chapters as reference."),
           S("MIT Press", "Theoretical Neuroscience Part III: plasticity and learning.")],
          "il_provides: the synthesis itself — an original comparative framing of what brains generalize and how, with every analogy labeled for its limits."),
    ]))

# ============================================================ IL-08: Algorithms
PATHS.append(P(
    "il08-mit-63", "IL-08",
    "MIT 6-3: The Distilled Core",
    "MIT's Course 6-3 in prerequisite order: 6.100A/B, 6.1200, 6.1210, 6.1220, 6.1910, 6.1800/6.1810, and theory. Training only.",
    "foundations", "advanced", 340, ["mit", "algorithms", "systems", "theory"],
    [
        M("mit63-programming", "Programming: 6.100A/B", "core",
          ["Python at MIT depth", "Computational thinking", "The problem-set discipline"],
          [S("MIT OpenCourseWare", "OCW 6.100A/B materials; training only, no certification.")],
          "il_provides: cross-link to IL-03's Python modules — one Python discipline, the MIT sets as the advanced problem bank."),
        M("mit63-mathcs", "Mathematics for CS: 6.1200", "math",
          ["Proofs, induction, number theory", "Graph theory", "Probability for computing"],
          [S("MIT OpenCourseWare", "OCW 6.1200 materials; training only.")],
          "il_provides: the single canonical discrete-math node shared with IL-02 — no duplicated courses."),
        M("mit63-algorithms", "Algorithms: 6.1210/6.1220", "core",
          ["Introduction to algorithms", "Design and analysis", "Lower bounds and NP-completeness"],
          [S("MIT OpenCourseWare", "OCW 6.1210/6.1220 materials; training only.")],
          "il_provides: the canonical algorithms node for the advanced track — IL-03's DSA is the applied sibling, this is the theoretical home."),
        M("mit63-compstruct", "Computation Structures: 6.1910", "core",
          ["From gates to the processor", "The hardware/software contract"],
          [S("MIT OpenCourseWare", "OCW 6.1910 materials; training only.")],
          "il_provides: simulator labs and the honest note on what needs real hardware versus what simulates faithfully."),
        M("mit63-systems", "Systems Engineering: 6.1800/6.1810", "core",
          ["Computer systems engineering", "Operating system engineering", "Design at scale"],
          [S("MIT OpenCourseWare", "OCW 6.1800/6.1810 materials; training only.")],
          "il_provides: the design-paper reading guide, cross-linked to IL-04's hands-on administration."),
        M("mit63-theory", "Theory: Automata to Complexity", "core",
          ["Finite automata and Turing machines", "Complexity classes", "The 6.1400 lineage"],
          [S("MIT OpenCourseWare", "OCW theory-course materials; training only.")],
          "il_provides: proof exercises with machine-checked steps — the theory track's assessment is formal, because the subject is."),
    ]))

PATHS.append(P(
    "il08-cmu-cs", "IL-08",
    "CMU: The Systems-and-Theory Spine",
    "Carnegie Mellon's CS core as a cross-walk: 15-122, 15-150, 15-210, 15-213, 15-251, 15-451, then 15-440/15-445/15-410.",
    "foundations", "advanced", 200, ["cmu", "systems", "theory", "reference"],
    [
        M("imperative-functional-core", "Imperative and Functional Core", "core",
          ["15-122: Principles of Imperative Computation", "15-150: Principles of Functional Programming", "Correctness as a habit"],
          [S("CMU SCS Course Catalog", "The official SCS catalog: course descriptions and prerequisites.")],
          "il_provides: the cross-walk — where CMU's sequence overlaps IL-03/IL-08's canonical nodes, the platform routes to the single node."),
        M("cmu-dsa-systems", "Data Structures and Systems", "core",
          ["15-210: Parallel and Sequential DSA", "15-213: Introduction to Computer Systems", "The malloc and shell labs"],
          [S("CMU SCS Course Catalog", "Official catalog: 15-210/15-213 descriptions.")],
          "il_provides: the famous labs reimplemented for the platform's sandbox — the shell lab and malloc lab as original exercises in their spirit."),
        M("cmu-theory", "Theory: 15-251 and 15-451", "core",
          ["15-251: Great Ideas in Theoretical CS", "15-451: Algorithm Design and Analysis", "Proofs plus programming"],
          [S("CMU SCS Course Catalog", "Official catalog: theory-course descriptions.")],
          "il_provides: theory integrated with problem solving, in CMU's style — every theorem ships with a programming exercise."),
        M("cmu-systems-depth", "Systems Depth: 15-440/15-445/15-410", "core",
          ["15-445: Database Systems", "15-440: Distributed Systems", "15-410: Operating System Design (build a kernel)"],
          [S("CMU SCS Course Catalog", "Official catalog: systems-elective descriptions and the 15-410 readiness gate.")],
          "il_provides: the readiness gate honestly enforced — 15-410's prerequisites (C, assembly, 2's complement fluency) are verified before the module opens."),
        M("cmu-ai-breadth", "AI Breadth: 07-280", "core",
          ["07-280: AI and Machine Learning I", "Search, ML, RL, probability", "AlexNet, GPT-2, AlphaZero implementations"],
          [S("CMU SCS Course Catalog", "Official catalog: 07-280 description.")],
          "il_provides: the bridge to IL-07's AI spine — CMU's integrated AI/ML intro as the on-ramp, with the deeper study routed to IL-07."),
    ]))

PATHS.append(P(
    "il08-stanford-cs", "IL-08",
    "Stanford: The Core Cross-Walk",
    "Stanford's CS core as a reference sequence: 106A/B, 103, 109, 107, 111, 161, with the depth branches mapped.",
    "foundations", "advanced", 100, ["stanford", "algorithms", "systems", "reference"],
    [
        M("programming-abstractions", "Programming: 106A/B", "core",
          ["106A: Programming Methodology (Python)", "106B: Programming Abstractions (C++)", "Recursion and data structures"],
          [S("Stanford ExploreCourses", "Stanford's official catalog: 106A/B descriptions and terms.")],
          "il_provides: the cross-walk — Stanford's sequence mapped onto IL-03's canonical programming nodes, with 106B's C++ depth as the differentiator."),
        M("stanford-mathcs", "Mathematical Foundations: 103 and 109", "math",
          ["CS 103: proofs, logic, graphs", "CS 109: probability for computer scientists"],
          [S("Stanford ExploreCourses", "Official catalog: CS 103/109 descriptions.")],
          "il_provides: routing to the single canonical nodes in IL-02 — the cross-walk, not a second course."),
        M("stanford-systems", "Systems: 107 and 111", "core",
          ["CS 107: Computer Organization and Systems", "CS 111: Operating Systems Principles (the current course)"],
          [S("Stanford ExploreCourses", "Official catalog: CS 107/111 descriptions; CS 111 is the current OS course.")],
          "il_provides: the modernization note — CS 111 replaces the retired CS 110/140 in this spine, and the platform teaches the current course."),
        M("stanford-algorithms", "Algorithms: CS 161", "core",
          ["Design and analysis of algorithms", "Divide-and-conquer, DP, graphs, randomization"],
          [S("Stanford ExploreCourses", "Official catalog: CS 161 description and prerequisites.")],
          "il_provides: CS 161's prerequisite chain (106B, 103, 109) made visible as the platform's own gates — the chain is the curriculum."),
        M("stanford-depth", "Depth Branches", "core",
          ["Theory: 154, 254", "Systems: 143, 144, 145", "AI: 221, 229, 230, 224N, 231N, 234"],
          [S("Stanford ExploreCourses", "Official catalog: depth-course descriptions.")],
          "il_provides: the branch map — each Stanford depth course routed to its canonical IL home (IL-07 for AI, IL-08 for theory/systems). One node per concept, university-wide."),
    ]))

# ============================================================ IL-09: Certifications
PATHS.append(P(
    "il09-comptia-core", "IL-09",
    "CompTIA Core Stack: A+, Network+, Security+",
    "The entry stack — A+ V15 (220-1201/1202), Network+ N10-009, Security+ SY0-701 — with the official pathway maps and stackable credentials.",
    "certification", "beginner", 220, ["comptia", "a-plus", "network-plus", "security-plus"],
    [
        M("aplus-v15", "A+ V15 (220-1201/1202)", "exam_prep",
          ["Core 1: hardware, networking, troubleshooting", "Core 2: OS, security, operational procedures", "PBQs and the 6-step methodology", "Exam-day logistics from real experience"],
          [S("CompTIA", "Official A+ objectives and exam information from comptia.org.")],
          "il_provides: genuine exam-day depth — the platform owner holds A+ CE (earned 4/30/2024, valid through 4/30/2027) and completed Per Scholas A+ training. PBQ drills and the troubleshooting methodology taught from experience, not from a dump."),
        M("networkplus-n10009", "Network+ N10-009", "exam_prep",
          ["Networking concepts 23%", "Implementation 20%, Operations 19%", "Security 14%, Troubleshooting 24%", "Readiness gate"],
          [S("CompTIA", "Official Network+ N10-009 objectives from comptia.org.")],
          "il_provides: cross-link to IL-04's networking path — one networking discipline; this module is the exam-prep layer over it."),
        M("securityplus-sy0701", "Security+ SY0-701", "exam_prep",
          ["General security concepts 12%", "Threats, vulnerabilities, mitigations 22%", "Architecture, operations, program management", "V8 expected ~Nov 17, 2026: the transition plan"],
          [S("CompTIA", "Official Security+ objectives from comptia.org; V8 launch timing per CompTIA's own notice.")],
          "il_provides: the V7/V8 transition bridge — what changes, what carries over, and a readiness gate that tracks both versions honestly."),
        M("stackable-core", "Stackables: CIOS, CSIS", "exam_prep",
          ["A+ + Network+ = CIOS", "A+ + Network+ + Security+ = CSIS", "The infrastructure and cybersecurity pathway maps"],
          [S("CompTIA", "Official stackable-certification documentation from help.comptia.org.")],
          "il_provides: the stacking planner — which combinations earn which stackables, and the order that minimizes exam spend."),
    ],
    [A("il09-core-diagnostic", "CompTIA Core Placement Diagnostic", "diagnostic", 0, 0,
       [I("Which A+ Core 1 domain carries the most weight?",
          ["Mobile Devices 13%", "Hardware 25%", "Virtualization & Cloud 11%", "Networking 23%"],
          1, "Per the official V15 objectives: Hardware 25%, HW/Network Troubleshooting 28%, Networking 23%.", "aplus"),
        I("A /24 network supports how many usable hosts?",
          ["254", "256", "510", "65534"], 0,
          "2^8 - 2 = 254 usable host addresses.", "networking"),
        I("Security+ SY0-701's largest domain is ___.",
          ["General Security Concepts", "Security Operations 28%", "Threats/Vulns/Mitigations", "Program Management"],
          1, "Security Operations is 28% of SY0-701 — the operational heart of the exam.", "security-plus"),
        I("Which stackable does A+ + Network+ earn?",
          ["CSIS", "CIOS", "CSSS", "CNVP"], 1,
          "CIOS (CompTIA IT Operations Specialist) = A+ + Network+.", "stackables"),
        I("CompTIA performance-based questions (PBQs) are best prepared for by ___.",
          ["memorizing dumps", "hands-on labs and simulations", "reading forums", "guessing"],
          1, "PBQs test applied skill; only hands-on practice transfers.", "exam-strategy")])]))

PATHS.append(P(
    "il09-comptia-security", "IL-09",
    "CompTIA Security Track: CySA+, PenTest+, SecurityX",
    "The cybersecurity pathway — CySA+ CS0-004, PenTest+ PT0-003, SecurityX CAS-005 — toward CSAE/CSIE stackables.",
    "certification", "intermediate", 240, ["comptia", "cysa", "pentest", "securityx"],
    [
        M("cysa-cs0004", "CySA+ CS0-004", "exam_prep",
          ["Security operations 34%", "Vulnerability management 26%", "Incident response 24%", "AI in security operations"],
          [S("CompTIA", "Official CySA+ objectives from comptia.org.")],
          "il_provides: SOC-scenario labs mapped to the CySA+ domains — cross-linked to IL-06's defensive path, which is the hands-on home."),
        M("pentest-pt0003", "PenTest+ PT0-003", "exam_prep",
          ["Engagement management 13%", "Recon and enumeration 21%", "Attacks and exploits 35%", "Post-exploitation 14%"],
          [S("CompTIA", "Official PenTest+ objectives from comptia.org.")],
          "il_provides: the methodology bridge to IL-06's offensive path — this module is the exam-prep layer; the hacking is taught in IL-06."),
        M("securityx-cas005", "SecurityX CAS-005", "exam_prep",
          ["GRC 20%", "Security architecture 27%", "Security engineering 31%", "Security operations 22%; pass/fail only"],
          [S("CompTIA", "Official SecurityX objectives from comptia.org; expert-level, pass/fail.")],
          "il_provides: architecture-scenario exercises at the expert level — the learner designs, then defends the design."),
        M("stackable-security", "Stackables: CSAP, CNVP, CNSP, CSAE, CSIE", "exam_prep",
          ["Security+ + CySA+ = CSAP", "Security+ + PenTest+ = CNVP", "The expert stackables"],
          [S("CompTIA", "Official stackable-certification documentation.")],
          "il_provides: the multi-year planner — the cybersecurity pathway as a sequenced campaign, not a pile of exams."),
    ]))

PATHS.append(P(
    "il09-comptia-data-cloud", "IL-09",
    "CompTIA Data and Cloud: Cloud+, Linux+, Server+, Data+, DataSys+, DataAI, and More",
    "The infrastructure and data certifications — Cloud+ CV0-004, Linux+ XK0-006, Server+ SK0-005, Data+ DA0-002, DataSys+ DS0-001/V2, DataAI DY0-001, Project+ PK0-005, Tech+ FC0-U71, CloudNetX CNX-001.",
    "certification", "intermediate", 220, ["comptia", "cloud-plus", "linux-plus", "data-plus", "dataai"],
    [
        M("cloudplus-cv0004", "Cloud+ CV0-004", "exam_prep",
          ["Cloud architecture 23%", "Deployment 19%, Operations 17%", "Security 19%, DevOps fundamentals 10%", "Troubleshooting 12%"],
          [S("CompTIA", "Official Cloud+ objectives from comptia.org.")],
          "il_provides: the cloud-operations bridge to IL-05 — this module preps the exam; IL-05 teaches the craft."),
        M("linuxplus-xk0006", "Linux+ XK0-006 (V8)", "exam_prep",
          ["System management 23%", "Services and user management 20%", "Security 18%, automation 17%", "Troubleshooting 22%"],
          [S("CompTIA", "Official Linux+ V8 objectives from comptia.org.")],
          "il_provides: cross-link to IL-04's Linux path — one Linux discipline; this module is the exam-prep layer, with the V7-to-V8 changes called out."),
        M("serverplus-sk0005", "Server+ SK0-005", "exam_prep",
          ["Hardware installation 18%", "Server administration 30%", "Security and disaster recovery 24%", "Troubleshooting 28%"],
          [S("CompTIA", "Official Server+ objectives from comptia.org.")],
          "il_provides: hardware-lifecycle scenarios and disaster-recovery drills — the physical layer most cloud learners never touch."),
        M("dataplus-da0002", "Data+ DA0-002", "exam_prep",
          ["Data concepts 20%", "Acquisition and preparation 22%", "Analysis 24%, visualization 20%", "Governance 14%"],
          [S("CompTIA", "Official Data+ objectives from comptia.org.")],
          "il_provides: the analyst-skills bridge to IL-07 — exam prep here, the craft in the data-school spine."),
        M("datasys-ds0001", "DataSys+ DS0-001 (V2 Oct 13, 2026)", "exam_prep",
          ["V1 domains and the V2 changes", "New in V2: Data Integration 13%", "Database administration depth", "Readiness gate"],
          [S("CompTIA", "Official DataSys+ objectives; V2 launches October 13, 2026.")],
          "il_provides: the V1/V2 transition map — what carries over, what's new, and which version to book."),
        M("dataai-dy0001", "DataAI DY0-001 (formerly DataX)", "exam_prep",
          ["Math and statistics 17%", "Modeling and analysis 24%", "Machine learning 24%", "Operations 22%; pass/fail only"],
          [S("CompTIA", "Official DataAI objectives from comptia.org; renamed from DataX.")],
          "il_provides: the math-readiness audit against IL-02's probability/statistics nodes — the exam assumes mathematical maturity the platform verifies."),
        M("project-tech-plus", "Project+ PK0-005 and Tech+ FC0-U71", "exam_prep",
          ["Project+ V5 domains", "Tech+ (replaces ITF+): the 11 curriculum topics", "The entry-level on-ramp"],
          [S("CompTIA", "Official Project+ and Tech+ objectives from comptia.org.")],
          "il_provides: the true-beginner on-ramp — Tech+ as the first credential for the learner starting from zero, honestly positioned."),
        M("cloudnetx-cnx001", "CloudNetX CNX-001", "exam_prep",
          ["Network architecture design 31%", "Network security 28%", "Operations and troubleshooting", "Expert-level, pass/fail only"],
          [S("CompTIA", "Official CloudNetX objectives from comptia.org.")],
          "il_provides: the expert hybrid-cloud networking scenarios — architecture design exercises at the level the exam demands."),
    ]))

PATHS.append(P(
    "il09-vendor-ai", "IL-09",
    "Vendor AI Certifications",
    "The AI credential landscape: Anthropic, OpenAI, NVIDIA, Databricks, Microsoft, Google Cloud, AWS — tiered honestly by what each credential actually is.",
    "certification", "intermediate", 140, ["ai-certs", "anthropic", "aws", "azure", "gcp"],
    [
        M("anthropic-claude-certs", "Anthropic: Claude Certified", "exam_prep",
          ["Associate, Developer, Architect tiers", "Pearson VUE delivery (reported)", "The partner-email gate", "Credential tiering: proctored exams"],
          [S("Anthropic", "anthropic.com: exam-booking details not on a retrievable official page; specs not asserted.")],
          "il_provides: preparation mapped to the reported domains with the gate stated plainly — a partner-company email is required, and the platform says so before the learner invests."),
        M("openai-program-track", "OpenAI: Program Track", "exam_prep",
          ["AI Foundations (pilot)", "The full credential (pilot)", "Academy badges vs. proctored exams", "Tracked-program status"],
          [S("OpenAI", "openai.com: certifications are employer/university pilot-only; nothing public is bookable.")],
          "il_provides: the tracked-program page — what exists, what's pilot-only, and the preparation that transfers whenever the program opens. Never implies a bookable exam."),
        M("nvidia-databricks", "NVIDIA and Databricks", "exam_prep",
          ["NCA-GENL: Generative AI LLMs", "Databricks Generative AI Engineer Associate", "Preparation per reported domains"],
          [S("NVIDIA", "nvidia.com: objectives page not retrieved; specs not asserted."),
           S("Databricks", "databricks.com: official page not verified; specs not asserted.")],
          "il_provides: preparation with the honesty label attached — domains from corroborated sources, never presented as vendor-published fact."),
        M("microsoft-azure-ai", "Microsoft: Azure AI", "exam_prep",
          ["AI-901: Azure AI Fundamentals", "AI-103: AI Apps and Agents Developer Associate", "Microsoft Learn as the source of truth"],
          [S("Microsoft Learn", "Microsoft's certification portal; consult Microsoft Learn for current exam pages.")],
          "il_provides: hands-on Azure AI labs mapped to the reported domains, with Microsoft Learn as the cited source of truth for every exam-day fact."),
        M("google-cloud-ai", "Google Cloud: AI Credentials", "exam_prep",
          ["Generative AI Leader (strategic)", "Professional Machine Learning Engineer", "Vertex AI and Model Garden"],
          [S("Google Cloud", "cloud.google.com: consult Google Cloud's official pages for current blueprints.")],
          "il_provides: the two credentials kept distinct — the Leader exam is strategic, the PMLE is technical, and preparation differs accordingly."),
        M("aws-ai-ml", "AWS: AI Practitioner and ML Engineer", "exam_prep",
          ["AIF-C01: AI Practitioner", "MLA-C02: ML Engineer Associate", "Bedrock and the GenAI additions"],
          [S("AWS Training", "AWS Training and Certification: consult AWS for current exam guides.")],
          "il_provides: the retirement-aware map — MLA-C01's last day and MLS-C01's retirement are recorded so no learner prepares for a dead exam."),
    ]))

PATHS.append(P(
    "il09-oracle", "IL-09",
    "Oracle: Java, SQL, and OCI",
    "Oracle's certification families — Java SE 21 (1Z0-830), Database SQL (1Z0-071), OCI 2026 — with official objectives as the topic maps.",
    "certification", "intermediate", 100, ["oracle", "java", "sql", "oci"],
    [
        M("java-se21", "Java SE 21 Developer (1Z0-830)", "exam_prep",
          ["50 questions, 120 min, 68% to pass", "Streams, lambdas, modules", "Concurrency incl. virtual threads", "I/O, localization, generics"],
          [S("Oracle Education", "Official 1Z0-830 objectives from education.oracle.com.")],
          "il_provides: the objective-by-objective readiness dashboard with coding drills per topic — cross-linked to IL-03's Java module, which is the learning home."),
        M("oracle-sql", "Oracle Database SQL (1Z0-071)", "exam_prep",
          ["63 questions, 120 min, 63% to pass", "Queries, joins, subqueries", "DDL and DML", "The 23ai SQL Associate (1Z0-171) note"],
          [S("Oracle Education", "Official 1Z0-071 objectives from education.oracle.com.")],
          "il_provides: the SQL query gym shared with IL-03's databases module — one query discipline, examined through Oracle's lens here."),
        M("oci-foundations", "OCI Foundations Associate (1Z0-1085-26)", "exam_prep",
          ["40 questions, 60 min, 65% to pass; free exam", "Core services 50%", "Security 25%, governance 10%", "The year-versioned program"],
          [S("Oracle Education", "Official 1Z0-1085-26 objectives from education.oracle.com.")],
          "il_provides: the free-exam fast track — the one Oracle exam with no fee becomes the learner's first cloud credential, honestly positioned."),
        M("oci-professional", "OCI Professional Tracks", "exam_prep",
          ["Architect Associate (1Z0-1072-26)", "Developer, DevOps, Networking, Security Professional", "The 2026 versioning"],
          [S("Oracle Education", "The OCI certification path page from education.oracle.com.")],
          "il_provides: the professional-track planner with the versioning caveat — 2025-to-2026 transitions tracked, unverified details never asserted."),
    ]))

PATHS.append(P(
    "il09-lf-blockchain", "IL-09",
    "Linux Foundation Blockchain: HFCP and BCP",
    "Hyperledger Fabric Certified Practitioner and Besu Certified Professional — the LF's two live blockchain certifications.",
    "certification", "intermediate", 60, ["blockchain", "hyperledger", "besu"],
    [
        M("hfcp-prep", "HFCP: Hyperledger Fabric Certified Practitioner", "exam_prep",
          ["90-min online proctored multiple-choice", "Fabric networks 36%", "Smart contracts 24%, client apps 24%", "The LFS270 prep course"],
          [S("Linux Foundation Training", "Official HFCP page from training.linuxfoundation.org.")],
          "il_provides: the performance-lab layer the multiple-choice exam doesn't test — chaincode written, deployed, and debugged, because the coverage guarantee rests on labs here."),
        M("bcp-prep", "BCP: Besu Certified Professional", "exam_prep",
          ["90-min online proctored; two attempts included", "Networking 26%, core concepts 24%", "Permissioning, privacy, consensus", "Valid 2 years"],
          [S("Linux Foundation Training", "Official BCP page from training.linuxfoundation.org.")],
          "il_provides: Besu network labs — the learner runs nodes, because a multiple-choice exam about networks deserves hands-on networks."),
        M("retired-blockchain", "Retired: What Not to Build To", "exam_prep",
          ["LFS272/LFD272 retired", "CHFA/CHFD/CHSA performance exams replaced", "Sawtooth (LFS273) retired"],
          [S("Linux Foundation Training", "The live catalog holds exactly six SKUs; the retired lines are documented for avoidance.")],
          "il_provides: the negative curriculum — what the platform deliberately does not teach, so no learner prepares for a dead exam."),
    ]))

PATHS.append(P(
    "il09-palantir", "IL-09",
    "Palantir: Foundry and AIP Certifications",
    "The Palantir certification program (refreshed Aug-Sep 2026): Foundry & AIP Aware through the Associate exams — voucher-gated, honestly described.",
    "certification", "intermediate", 60, ["palantir", "foundry", "aip"],
    [
        M("foundry-aware", "Foundry & AIP Aware", "exam_prep",
          ["The ~8h official course-of-courses", "Entry tier", "Foundry account (free Developer Tier)"],
          [S("Palantir Learn", "learn.palantir.com: the official learning portal.")],
          "il_provides: the study schedule over Palantir's own courses — the platform organizes, Palantir teaches."),
        M("foundry-data-engineer", "Foundry Data Engineer Associate", "exam_prep",
          ["Timed open-book MCQ; valid 2 years", "Voucher from your Palantir POC", "Pipeline and ontology depth"],
          [S("Palantir Learn", "The official training tracks feeding the Associate exams.")],
          "il_provides: the voucher reality stated up front — free-tier users file a Foundry support ticket; the platform never implies self-booking."),
        M("foundry-appdev-ai", "App Developer and AI Engineer Associate", "exam_prep",
          ["Foundry Application Developer Associate", "AI Engineer Associate (the AIP/agent credential)", "Timed open-book MCQ; valid 2 years"],
          [S("Palantir Learn", "The official AI Engineer training track.")],
          "il_provides: the AIP agent-workflow preparation — the learner builds agentic workflows in the Developer Tier before sitting the exam."),
        M("palantir-boundaries", "Boundaries: What Isn't a Credential", "exam_prep",
          ["Apollo: internal, no public credential", "Gotham: gov-only, no public credential", "Legacy DS/DA tracks: status unverified"],
          [S("Palantir Learn", "What the portal offers — and therefore what it doesn't.")],
          "il_provides: the boundary record — the platform never lists an 'Apollo certification', because none exists."),
    ]))

PATHS.append(P(
    "il09-cpp-python", "IL-09",
    "C++ and Python Institute Certifications",
    "The language-vendor credentials: CPE/CPA/CPP for C++ and PCEP/PCAP/PCPP1/PCPP2 for Python, with OpenEDG's free aligned courses.",
    "certification", "beginner", 60, ["cpp", "python", "language-certs"],
    [
        M("cpp-track", "C++ Institute: CPE to CPP", "exam_prep",
          ["CPE-20-01: entry, 70% to pass", "CPA-21-02: associate", "CPP-22-02: professional", "The C branch: CLE/CLA/CLP"],
          [S("C++ Institute", "Official exam pages from cppinstitute.org: formats, syllabi, pricing.")],
          "il_provides: the exam-prep layer over IL-03's C++ modules — the learning lives in IL-03, the certification targeting lives here."),
        M("python-track", "Python Institute: PCEP to PCPP2", "exam_prep",
          ["PCEP: entry", "PCAP-31-03: associate", "PCPP1/PCPP2: professional", "OpenEDG free aligned courses"],
          [S("Python Institute", "Official pages from pythoninstitute.org: syllabi and the OpenEDG testing transition.")],
          "il_provides: the delivery-channel caveat — OpenEDG's move off Pearson VUE is tracked, and booking guidance is re-verified before it's published."),
    ]))

# ============================================================ IL-10: Career
PATHS.append(P(
    "il10-fde-career", "IL-10",
    "The Forward-Deployed Career",
    "The FDE career path — Discover, Model, Prove, Integrate, Operate, Generalize — with JobRight AI wired as the career-outcome layer.",
    "career", "intermediate", 100, ["fde", "career", "jobright", "interview"],
    [
        M("fde-career-arc", "The FDE Career Arc", "career",
          ["Discover: finding the problem", "Model and Prove: the technical core", "Integrate and Operate: shipping inside the customer", "Generalize: from engagement to product"],
          [S("Interview Kickstart FDE", "The official FDE program: the AI Engineering spine into the FDE spine.")],
          "il_provides: the career-stage self-assessment — the learner locates themselves on the arc and the platform sequences accordingly."),
        M("jobright-outcome-layer", "JobRight AI: The Outcome Layer", "career",
          ["AI-matched applications", "Application tracking against skills earned", "The feedback loop: outcomes refine the plan"],
          [S("JobRight AI", "jobright.ai: the AI job-matching platform.")],
          "il_provides: the wiring itself — the learner's verified skills from every academy flow into the job search as evidence, and outcomes flow back as plan adjustments."),
        M("interview-systems", "Interview Systems", "career",
          ["Technical interviews", "System design", "Behavioral: the FDE story", "Offer evaluation"],
          [S("Interview Kickstart FDE", "The program's interview-preparation spine as reference.")],
          "il_provides: mock interviews with a rubric — system design, coding, and the customer-facing story, each scored separately."),
    ]))

PATHS.append(P(
    "il10-humanmetrics", "IL-10",
    "Self-Knowledge: The Humanmetrics Assessment",
    "The Jung-typology career assessment as the self-knowledge layer beneath every career decision.",
    "career", "beginner", 40, ["assessment", "self-knowledge", "career-planning"],
    [
        M("typology-assessment", "The Typology Assessment", "career",
          ["The Jung typology instrument", "The 16 types as working styles", "What the instrument measures — and doesn't"],
          [S("Humanmetrics", "humanmetrics.com: the assessment instrument.")],
          "il_provides: the interpretation guide — the platform treats the result as one input among many, never as a verdict, with the instrument's limits stated."),
        M("career-fit-mapping", "Career-Fit Mapping", "career",
          ["Type to role-family mapping", "Working-style implications", "Team composition", "The development plan"],
          [S("Humanmetrics", "The type descriptions as the mapping source.")],
          "il_provides: the fit map — the learner's type against the university's career paths, as hypotheses to test through the work itself."),
    ]))

PATHS.append(P(
    "il10-entrepreneurship", "IL-10",
    "Entrepreneurship: The Babson-Informed Track",
    "Venture creation informed by Babson's majors-and-minors curriculum structure, with The Academy SF studied as a contemporary practitioner model.",
    "career", "intermediate", 80, ["entrepreneurship", "babson", "venture"],
    [
        M("babson-curriculum-map", "The Babson Curriculum Map", "career",
          ["Majors and minors structure", "Entrepreneurship as a discipline", "Finance, marketing, operations foundations", "The curriculum audit"],
          [S("Babson College", "babson.edu: the majors-and-minors directory; consult the official directory for current offerings.")],
          "il_provides: the founder's curriculum audit — which business foundations the technical learner lacks, sequenced as a reading and practice plan."),
        M("venture-building", "Venture Building", "career",
          ["Problem discovery", "The MVP discipline", "Unit economics", "Fundraising literacy"],
          [S("Babson College", "Babson's entrepreneurship curriculum structure as the topic map.")],
          "il_provides: the venture workbook — original canvases and unit-economics exercises, with Interstitium Labs itself as the worked example."),
        M("academy-sf-study", "The Academy SF: A Contemporary Model", "career",
          ["Practitioner-led education", "The AI/founder curriculum", "Hiring-partner integration", "What to borrow, what to avoid"],
          [S("The Academy SF", "theacademysf.com: the academy's public face.")],
          "il_provides: the competitive study — what a well-funded contemporary academy does right, analyzed without hype and without imitation."),
    ]))

PATHS.append(P(
    "il10-quant-finance", "IL-10",
    "Quantitative Finance: The Ladder",
    "Undergraduate quant preparation through the MIT MicroMasters in Finance toward PhD-level quant and consulting preparation.",
    "career", "advanced", 60, ["quant", "finance", "micromasters"],
    [
        M("undergrad-quant-prep", "Undergraduate Quant Preparation", "career",
          ["The mathematics prerequisite audit", "Probability and statistics at depth", "Programming for quant", "The internship map"],
          [S("MIT MicroMasters Finance", "The MicroMasters Finance curriculum as the downstream target.")],
          "il_provides: the prerequisite audit against IL-02's quant-math path — the platform verifies the mathematics before the learner applies."),
        M("micromasters-finance", "MIT MicroMasters in Finance", "exam_prep",
          ["Graduate-level finance courses", "The proctored comprehensive exam", "The degree-pathway value", "Preparation mapping"],
          [S("MIT MicroMasters Finance", "The official MicroMasters Finance program page.")],
          "il_provides: the preparation map per MicroMasters course, with readiness gates. The credential is MITx's; never implies endorsement."),
        M("phd-quant-consulting", "PhD-Level Quant and Consulting Prep", "career",
          ["The research-level mathematics", "Stochastic calculus", "Consulting case interviews", "The career fork: desk quant vs. researcher vs. consultant"],
          [S("MIT MicroMasters Finance", "The degree-pathway context for the research fork.")],
          "il_provides: the honest fork analysis — what each branch actually demands, in mathematics and in years, so the learner chooses with eyes open."),
    ]))

# ============================================================ FINAL CHUNK
# Timed battery items, battery injection, dedupe matrix, file output, validation.

ALGEBRA_ITEMS = [
    I("Solve for x: x/6 = (x/2) - (4/3).",
      ["2", "3", "4", "6"], 2,
      "Multiply through by 6: x = 3x - 8, so -2x = -8 and x = 4.", "linear-equations"),
    I("Solve for x: 5x + 3x - 9x = 15 - 21 + 9.",
      ["-3", "3", "-6", "6"], 0,
      "Left side: -x. Right side: 3. So -x = 3, x = -3.", "linear-equations"),
    I("Factor completely: x^2 - 9.",
      ["(x - 3)(x - 3)", "(x + 3)(x + 3)", "(x - 3)(x + 3)", "prime"], 2,
      "Difference of squares: a^2 - b^2 = (a - b)(a + b).", "factoring"),
    I("Solve the inequality: 3x - 5 > 10.",
      ["x < 5", "x > 5", "x >= 5", "x <= 5"], 1,
      "3x > 15, so x > 5 (no sign flip needed; the coefficient is positive).", "inequalities"),
    I("Solve the system: x + y = 10 and x - y = 4. The solution (x, y) is ___.",
      ["(7, 3)", "(3, 7)", "(5, 5)", "(6, 4)"], 0,
      "Add the equations: 2x = 14, x = 7; then y = 3.", "systems"),
    I("If f(x) = 2x^2 - 3x + 1, then f(-2) = ___.",
      ["3", "15", "9", "1"], 1,
      "f(-2) = 2(4) - 3(-2) + 1 = 8 + 6 + 1 = 15.", "functions"),
    I("Simplify: (4x^3 * y^2) / (2xy).",
      ["2x^2 * y", "2x^4 * y^3", "8x^2 * y", "2xy"], 0,
      "Coefficients 4/2 = 2; x^(3-1) = x^2; y^(2-1) = y.", "exponents"),
    I("What comes next in the series: 2, 6, 12, 20, 30, ___?",
      ["38", "40", "42", "44"], 2,
      "Differences are 4, 6, 8, 10; the next difference is 12, so 30 + 12 = 42.", "series"),
    I("15% of 240 = ___.",
      ["30", "36", "42", "48"], 1,
      "0.15 x 240 = 36.", "percentages"),
    I("Solve for x: 2(x - 3) = 4x + 2.",
      ["-4", "4", "-2", "8"], 0,
      "2x - 6 = 4x + 2, so -2x = 8 and x = -4.", "linear-equations"),
    I("Solve for x: 3/x = 9/12.",
      ["3", "4", "6", "12"], 1,
      "9/12 reduces to 3/4, so 3/x = 3/4 and x = 4.", "proportions"),
    I("If f(x) = x^2 + 1, then f(3) - f(2) = ___.",
      ["5", "9", "4", "6"], 0,
      "f(3) = 10, f(2) = 5; 10 - 5 = 5.", "functions"),
    I("Solve for c: a = bc.",
      ["c = a/b", "c = ab", "c = b/a", "c = a - b"], 0,
      "Divide both sides by b: c = a/b.", "literal-equations"),
    I("The sum of two consecutive even integers is 34. The larger integer is ___.",
      ["16", "17", "18", "20"], 2,
      "Let the integers be n and n+2: 2n + 2 = 34, n = 16, so the larger is 18.", "word-problems"),
]

PASSAGE_OHM = (
    "Passage A (original). Voltage is the electrical pressure that pushes charge through a circuit, "
    "measured in volts. Current is the flow of charge, measured in amperes. Resistance opposes that flow, "
    "measured in ohms. Ohm's law ties the three together: V = I x R, so current equals voltage divided by "
    "resistance. Resistors can be wired in series, end to end along a single path, or in parallel, across "
    "separate branches that share the same two connection points. In a series circuit, the same current flows "
    "through every component and the total resistance is the sum of the individual resistances; this is why "
    "fuses and circuit breakers are wired in series with the load - every ampere of current must pass through "
    "the protective device. In a parallel circuit, each branch sees the full source voltage, and the total "
    "current is the sum of the branch currents; adding branches lowers the total resistance. A string of "
    "holiday lights wired in series all go dark when one bulb fails, because the single path is broken. Wired "
    "in parallel, each bulb keeps its own path, and each receives the full source voltage, so surviving bulbs "
    "burn at full brightness."
)
PASSAGE_NEC = (
    "Passage B (original). The National Electrical Code is not read like a novel. Electricians are taught to "
    "read code articles with the SQ3R method: Survey the article for headings and scope, turn each heading "
    "into a Question, Read to answer it, Recite the answer in your own words, and Review. This discipline "
    "matters because code language is precise in ways ordinary English is not. The word 'shall' means the "
    "rule is mandatory - it has the force of law wherever the Code is adopted. The phrase 'shall be permitted' "
    "means the action is allowed but not required; it grants permission and nothing more. Confusing the two "
    "changes compliance: treating a permitted method as required adds cost, while treating a requirement as "
    "optional creates a violation. One of the most-tested rules is the continuous-load rule: a branch-circuit "
    "conductor supplying a continuous load (three hours or more) must be rated at least 125% of the load. A "
    "16-ampere continuous load therefore needs a conductor rated at least 20 amperes. SQ3R forces you to state "
    "that rule back before moving on - and to prove you know whether the Code says you 'shall' or 'shall be "
    "permitted' to use the next size up."
)
READING_ITEMS = [
    I(PASSAGE_OHM + "\n\n1. A 120-ohm resistor is connected across 24 volts. The current through it is ___.",
      ["0.2 A", "2 A", "5 A", "0.5 A"], 0,
      "I = V/R = 24/120 = 0.2 A.", "quantitative-reading"),
    I("According to Passage A, in a series circuit the total resistance is ___.",
      ["less than the smallest resistor", "the sum of the individual resistances", "the average of the resistances", "zero"], 1,
      "Series resistances add; the passage states the total is the sum.", "detail"),
    I("According to Passage A, which statement about parallel branches is true?",
      ["Each branch carries the same current.", "Each branch sees the full source voltage.", "The total resistance is the sum of the branches.", "A fuse must be wired in parallel."], 1,
      "Parallel branches share the same two connection points, so each sees full source voltage.", "detail"),
    I("According to Passage A, fuses are wired in series because ___.",
      ["series wiring is cheaper", "series wiring doubles the voltage", "all current must pass through the protective device", "parallel fuses overheat"], 2,
      "In series the same current flows through every component - the protective device sees every ampere.", "inference"),
    I("According to Passage A, if identical bulbs are wired in parallel instead of series, each bulb is ___.",
      ["dimmer, because the voltage is split", "at full brightness, because each receives the full source voltage", "off, because the path is broken", "at half brightness"], 1,
      "The passage states each parallel bulb keeps its own path at full source voltage.", "inference"),
    I("The main idea of Passage A is ___.",
      ["fuses are more important than resistors", "the relationship between voltage, current, and resistance, and how series and parallel wiring change circuit behavior", "holiday lights are poorly designed", "parallel circuits are always better than series circuits"], 1,
      "The passage defines V, I, R, states Ohm's law, then contrasts series and parallel wiring.", "main-idea"),
    I(PASSAGE_NEC + "\n\n7. According to Passage B, the reading strategy recommended for code articles is ___.",
      ["skimming", "SQ3R: Survey, Question, Read, Recite, Review", "memorization", "speed reading"], 1,
      "The passage explicitly names SQ3R and defines each step.", "detail"),
    I("According to Passage B, a continuous load of 16 amperes requires a branch-circuit conductor rated at least ___ amperes.",
      ["16", "18", "20", "25"], 2,
      "The continuous-load rule: 125% of 16 A = 20 A.", "quantitative-reading"),
    I("According to Passage B, the word 'shall' in the Code means the rule is ___.",
      ["optional", "mandatory", "recommended", "under review"], 1,
      "'Shall' carries the force of law wherever the Code is adopted.", "detail"),
    I("According to Passage B, the phrase 'shall be permitted' means the action is ___.",
      ["required", "forbidden", "allowed but not required", "mandatory on inspection day"], 2,
      "It grants permission and nothing more - allowed, never required.", "detail"),
    I("According to Passage B, why must 'shall' be distinguished from 'shall be permitted'?",
      ["Because the Code is written in Latin.", "Because confusing a requirement with a permission changes code compliance - either adding cost or creating a violation.", "Because inspectors dislike long words.", "Because the two phrases mean the same thing."], 1,
      "Treating permission as requirement adds cost; treating requirement as optional creates a violation.", "inference"),
    I("According to Passage B, the first S in SQ3R stands for ___.",
      ["Skim", "Survey", "Study", "Summarize"], 1,
      "Survey: scan the article's headings and scope before reading in depth.", "detail"),
]

# ---------- Inject the authored batteries into the electrician path ----------
for _p in PATHS:
    if _p["id"] == "il02-electrician":
        for _a in _p["assessments"]:
            if _a["id"] == "etapps-algebra-battery":
                _a["title"] = "etA Aptitude: Algebra Battery — 14-Question Timed"
                _a["questions"] = len(ALGEBRA_ITEMS)
                _a["minutes"] = 21
                _a["items"] = ALGEBRA_ITEMS
            elif _a["id"] == "etapps-reading-battery":
                _a["title"] = "etA Aptitude: Reading Battery — 12-Question Timed"
                _a["questions"] = len(READING_ITEMS)
                _a["minutes"] = 17
                _a["items"] = READING_ITEMS

# ---------- Dedupe matrix ----------
MANUAL_DEDUPE = [
    {"course": "Webucator Java + Python bundle", "sources": ["Webucator"],
     "decision": "merged",
     "reason": "Bundle duplicates the platform's canonical Java/Python programming nodes; merged into the programming backbone (canonical node il03-pearson-programming/python-foundations) instead of a second course.",
     "canonical": "il03-pearson-programming/python-foundations"},
    {"course": "Webucator Full Stack bundle (~20 courses)", "sources": ["Webucator"],
     "decision": "merged",
     "reason": "Bundle duplicates the platform's canonical web-fundamentals node; routed to the single node rather than rebuilt as a course.",
     "canonical": "il03-pearson-systems/web-fundamentals"},
    {"course": "Per Scholas Cloud DevOps (14-week program)", "sources": ["Per Scholas"],
     "decision": "merged",
     "reason": "Program duplicates the platform's canonical DevOps role map; routed to il05-kodekloud rather than rebuilt as a course.",
     "canonical": "il05-kodekloud/devops-role-map"},
    {"course": "Per Scholas Software Engineering: AI Native", "sources": ["Per Scholas"],
     "decision": "merged",
     "reason": "Program duplicates the platform's canonical full-stack capstone; routed to the single node rather than rebuilt as a course.",
     "canonical": "il03-pearson-systems/capstone-build"},
    {"course": "Stanford CS 106A / 106B", "sources": ["Stanford ExploreCourses"],
     "decision": "merged",
     "reason": "Sequence duplicates the platform's canonical Stanford cross-walk; routed to il08-stanford-cs rather than rebuilt as a course.",
     "canonical": "il08-stanford-cs/programming-abstractions"},
    {"course": "CMU 15-112 / 15-122", "sources": ["CMU SCS Course Catalog"],
     "decision": "merged",
     "reason": "Sequence duplicates the platform's canonical CMU cross-walk; routed to il08-cmu-cs rather than rebuilt as a course.",
     "canonical": "il08-cmu-cs/imperative-functional-core"},
    {"course": "MIT 6.100A / 6.100B", "sources": ["MIT OpenCourseWare"],
     "decision": "merged",
     "reason": "Sequence duplicates the platform's canonical MIT OCW Python node; routed to il03-mit-ocw rather than rebuilt as a course.",
     "canonical": "il03-mit-ocw/python-6100ab"},
    {"course": "Khan Academy / ALEKS math spine", "sources": ["Khan Academy", "ALEKS"],
     "decision": "kept",
     "reason": "Kept as the canonical math-spine source layer; the platform's college-algebra node is built on these, not duplicated elsewhere.",
     "canonical": "il02-math-spine/college-algebra"},
    {"course": "Google Career Certificate search properties (google.com/104, 106, 369, 370)",
     "sources": [], "decision": "dropped",
     "reason": "Scope boundary (Rev 2 section 6): these Google certificate properties are out of scope and must not be built.",
     "canonical": None},
    {"course": "Google property (google.com/25)", "sources": [],
     "decision": "dropped",
     "reason": "Scope boundary (Rev 2 section 6): out of scope and must not be built.",
     "canonical": None},
    {"course": "NSA as a certification issuer", "sources": [],
     "decision": "dropped",
     "reason": "Boundary record: the NSA issues no attainable public certifications; it appears in the NICE lineage only, never as a credential target.",
     "canonical": None},
    {"course": "MIT mathematics PhD qualifying examinations", "sources": [],
     "decision": "dropped",
     "reason": "Boundary record: oral, department-internal qualifying exams with no public credential; out of scope for a self-study platform.",
     "canonical": None},
]
AUTO_DEDUPE = [
    {"course": s["name"], "sources": [s["name"]], "decision": "kept",
     "reason": "Official or primary source retained at its canonical node: %s." % s["canonical"],
     "canonical": s["canonical"]}
    for s in SOURCES
]
DEDUPE = MANUAL_DEDUPE + AUTO_DEDUPE

SOURCES_JSON = [
    {"name": s["name"], "url": s["url"], "category": s["category"],
     "description": s["description"], "used_in": s["used_in"]}
    for s in SOURCES
]
CATALOG = {"academies": ACADEMIES, "paths": PATHS}

# ---------- Validation ----------
import os, json

def _fail(msg):
    raise SystemExit("VALIDATION FAILED: " + msg)

# 1. No duplicate (path, module) titles
_seen = set()
for _p in PATHS:
    for _m in _p["modules"]:
        _key = (_p["id"], _m["title"])
        if _key in _seen:
            _fail("duplicate (path,module) title: %r" % (_key,))
        _seen.add(_key)

# 2. Every module has >=1 real http source
for _p in PATHS:
    for _m in _p["modules"]:
        if not _m["sources"]:
            _fail("module %s/%s has no sources" % (_p["id"], _m["id"]))
        for _s in _m["sources"]:
            if not _s["url"].startswith("http"):
                _fail("module %s/%s source %r has non-http url %r"
                      % (_p["id"], _m["id"], _s["name"], _s["url"]))

# 3. Timed assessments >=10 items, valid answer index
for _p in PATHS:
    for _a in _p.get("assessments", []):
        if _a["kind"] == "timed":
            if len(_a["items"]) < 10:
                _fail("timed assessment %s has only %d items" % (_a["id"], len(_a["items"])))
            if _a["questions"] != len(_a["items"]):
                _fail("timed assessment %s questions=%d but items=%d"
                      % (_a["id"], _a["questions"], len(_a["items"])))
            for _i, _it in enumerate(_a["items"]):
                if not (0 <= _it["answer"] < len(_it["choices"])):
                    _fail("assessment %s item %d has invalid answer index" % (_a["id"], _i))
                if not _it["explain"].strip():
                    _fail("assessment %s item %d has empty explanation" % (_a["id"], _i))

# 4. Academy hour sums match the fixed academy totals
_hours = {a["code"]: 0 for a in ACADEMIES}
for _p in PATHS:
    _hours[_p["academy"]] += _p["hours"]
for _a in ACADEMIES:
    if _hours[_a["code"]] != _a["hours"]:
        _fail("academy %s path-hours %d != fixed %d"
              % (_a["code"], _hours[_a["code"]], _a["hours"]))

# 5. Dedupe covers every sources.json name
_covered = set()
for _d in DEDUPE:
    _covered.update(_d["sources"])
for _s in SOURCES_JSON:
    if _s["name"] not in _covered:
        _fail("dedupe missing source: %r" % _s["name"])

# 6. Every non-null canonical target exists
_paths = {p["id"]: p for p in PATHS}
for _d in DEDUPE:
    _c = _d["canonical"]
    if _c is None:
        if _d["decision"] != "dropped":
            _fail("dedupe %r has null canonical but decision %r" % (_d["course"], _d["decision"]))
        continue
    _parts = _c.split("/")
    _pid = _parts[0]
    if _pid not in _paths:
        _fail("dedupe %r canonical path %r does not exist" % (_d["course"], _pid))
    if len(_parts) > 1:
        _mids = {m["id"] for m in _paths[_pid]["modules"]}
        if _parts[1] not in _mids:
            _fail("dedupe %r canonical module %r not in path %r" % (_d["course"], _c, _pid))

# ---------- Write the three files ----------
OUT = os.path.expanduser(
    "~/workspace/goals/interstitium-labs-learning-university-build/build/data")
os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, "catalog.json"), "w") as _f:
    json.dump(CATALOG, _f, indent=2)
with open(os.path.join(OUT, "dedupe-matrix.json"), "w") as _f:
    json.dump(DEDUPE, _f, indent=2)
with open(os.path.join(OUT, "sources.json"), "w") as _f:
    json.dump(SOURCES_JSON, _f, indent=2)

print("OK: %d academies, %d paths, %d modules, %d assessments, %d sources, %d dedupe entries" % (
    len(ACADEMIES), len(PATHS),
    sum(len(p["modules"]) for p in PATHS),
    sum(len(p.get("assessments", [])) for p in PATHS),
    len(SOURCES_JSON), len(DEDUPE)))
