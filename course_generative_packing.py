#!/usr/bin/env python3
"""Insert the 'Generative Art: Circle Packing' path into shard-a.json and data/catalog.json."""
import json, copy

PATT = "https://www.pattlas.com/patterns/IyVRdQcdSJc"

path = {
  "id": "il03-generative-packing",
  "academy": "IL-03",
  "title": "Generative Art: Circle Packing",
  "subtitle": "Pack circles, read parameters, make fields. A first-principles studio course in generative composition, built around an interactive packing playground you control.",
  "type": "foundations",
  "difficulty": "beginner",
  "hours": 40,
  "status": "published",
  "tags": ["generative-art", "creative-coding", "canvas", "algorithms", "packing", "design"],
  "modules": [
    {
      "id": "packing-problem",
      "title": "The Packing Problem",
      "kind": "core",
      "topics": ["What circle packing is", "Rejection sampling", "Seeded randomness", "Poisson-disc sampling", "Front-chain packing", "Spatial grids"],
      "il_provides": "First-principles instruction in the packing problem: why circles and not squares, the honest rejection-sampling packer with a seeded random generator, and how Poisson-disc and front-chain methods trade speed for uniformity. Original prose, worked placement traces, and self-checks — no copied code.",
      "sources": [
        {"name": "Pattlas — “7月16日” by Hitoshi Takagi", "url": PATT, "note": "The generative piece that inspired this course: dense overlapping violet circles driven by a parameter block (Span, Factor, NC, Alpha, AngleX, AngleY, BLEND). Inspiration and parameter vocabulary only — our packer and mappings are original."},
        {"name": "Wikipedia — Circle packing", "url": "https://en.wikipedia.org/wiki/Circle_packing", "note": "Reference for the mathematical packing problem: arrangements of circles with no overlap."},
        {"name": "MDN — Canvas API", "url": "https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API", "note": "The 2D drawing surface used by the course playground."}
      ],
      "lessons": [
        {
          "title": "Circles, not squares",
          "body": [
            "Circle packing is the problem of arranging circles inside a region so that no two overlap, usually as densely as the rules allow. It is one of the oldest problems in geometry — Kepler thought about sphere packing in 1611 — and one of the youngest in art, because only a computer can place ten thousand circles before lunch.",
            "Generative artists reach for circles for three honest reasons. First, a circle looks the same from every direction: it has no corners to snag the eye, so a field of circles reads as texture rather than as a collection of objects. Second, circles nest against each other naturally; the gaps between them form their own secondary pattern, which is where much of the beauty lives. Third, a circle is the cheapest interesting shape to test — one distance check decides overlap — so packing algorithms stay simple enough to hold in your head.",
            "You have seen packing everywhere without naming it: foam on a poured drink, the cells in a leaf photographed from above, pebbles sorted by a stream, the halftone dots of a printed photograph, stipple shading in an engraving. Each is a packing produced by some physical process. Generative art replaces the physical process with a procedure you design — and the procedure is the artwork as much as the image.",
            "The piece that inspired this course, “7月16日” by Hitoshi Takagi on the creative-coding platform Pattlas, is a dense field of overlapping violet circles and loops. Its whole visual identity is carried not by drawn shapes but by eight parameters — Span, Factor, NC, Alpha, AngleX, AngleY, BLEND, and a text label. Learning to read that parameter block as a set of design decisions is the central skill of this course."
          ],
          "worked": [
            {"problem": "Why does a circle field look organic while a grid of circles looks mechanical, even when both use identical circles?",
             "solution": "A grid repeats two spacings — horizontal and vertical — and the human visual system is a ruthless repetition detector. Packing breaks both spacings at once: every circle sits at a slightly different distance from its neighbors, so there is no period for the eye to lock onto. Randomness alone is not enough — pure random placement clumps and leaves voids — which is why packing algorithms exist: they produce irregularity with even coverage, the visual signature of natural processes."}
          ],
          "checks": [
            {"q": "In your own words, what is the circle-packing problem?", "a": "Arranging circles inside a region so none overlap, usually as densely as allowed — a geometric problem the course treats as a generative-art procedure."},
            {"q": "Name two natural and two designed examples of circle packing.", "a": "Natural: foam bubbles, plant cells, pebbles. Designed: halftone print dots, stipple engraving, dot-matrix displays. Any two of each."}
          ]
        },
        {
          "title": "Rejection sampling: the honest algorithm",
          "body": [
            "The simplest correct packing algorithm fits in a paragraph: propose a random position and radius, test the candidate circle against every circle placed so far, keep it if it overlaps nothing (with the required gap), otherwise throw it away and try again. Repeat until you have enough circles or you run out of patience. This is rejection sampling, and its honesty is its virtue — there is no hidden cleverness, so when the output looks wrong you know exactly where to look.",
            "Two details make it practical. First, the random generator must be seeded: a seeded pseudo-random generator (the playground uses the mulberry32 algorithm) produces the same stream of numbers from the same seed, which means the same seed always grows the same field. Reproducibility turns accidents into studies — you can change one parameter and know the difference you see came from the parameter, not from a new roll of the dice.",
            "Second, naive overlap testing compares each candidate against every placed circle, which is quadratic work — placing the thousandth circle costs a thousand distance checks, and most candidates get rejected late in the run when the field is crowded. The standard fix is a spatial grid: divide the canvas into cells roughly one diameter wide, file each placed circle under its cell, and test a candidate only against circles in nearby cells. The algorithm stays identical; only the bookkeeping gets faster.",
            "Every packing run needs a stopping rule, because a truly dense field would reject candidates forever. Ours uses two: a target circle count scaled to the canvas area, and an attempts budget — a multiple of the target — after which we stop and keep what we placed. A run that stops on the budget instead of the target is telling you something: the parameters asked for more density than the geometry allows, and the honest response is a sparser field, not an infinite loop."
          ],
          "worked": [
            {"problem": "Trace four placements by hand. Canvas 100×100, gap 4, seeded so candidates arrive as: (20,20,r6), (26,20,r6), (60,60,r10), (63,63,r10). Which are accepted?",
             "solution": "(20,20,r6) is first — accepted. (26,20,r6): distance to the first is 6, but the rule needs r1+r2+gap = 6+6+4 = 16 — rejected. (60,60,r10): far from everything — accepted. (63,63,r10): distance to (60,60) is about 4.2, needs 10+10+4 = 24 — rejected. Two accepted, two rejected: the rejections are the algorithm doing its job, not failing."}
          ],
          "checks": [
            {"q": "Why must the random generator be seeded in a packing playground?", "a": "So the same seed reproduces the same field — then a visible change can be attributed to the parameter you changed, not to a fresh random stream."},
            {"q": "What does a spatial grid change about rejection sampling — the result or the speed?", "a": "Only the speed. The accepted set is identical; the grid just avoids testing candidates against circles that are too far away to overlap."}
          ]
        },
        {
          "title": "Faster cousins: Poisson-disc and front-chain",
          "body": [
            "Rejection sampling is the algorithm you learn first because it is obviously correct. Two relatives dominate production use, and you should know what each buys you. Poisson-disc sampling (Robert Bridson's 2007 algorithm is the standard form) keeps an active list of placed points and proposes new candidates only in the ring around them, at a controlled distance. It guarantees a minimum spacing with far fewer rejections, and it produces the famously even 'blue noise' distributions used in rendering and stippling.",
            "Front-chain packing takes a different tack: each new circle is placed tangent to two already-placed circles (and the boundary), walking a frontier around the packed region. It achieves very high density — the circles kiss — but the code is fiddlier and the result can look engineered rather than grown, because tangency chains leave characteristic curved seams.",
            "The trade-off is always the same three-way pull: uniformity of coverage, density of packing, and simplicity of code. Rejection sampling is simple and honest but slow to densify. Poisson-disc is fast and even but enforces a minimum distance that fights the overlapping, loopy look of our inspiration piece. Front-chain is dense but intricate.",
            "Our playground deliberately uses rejection sampling with a spatial grid: it is the easiest algorithm to reason about, it permits overlap control through the gap parameter (including the negative-gap looseness that lets circles kiss and overlap like the reference piece), and its failure mode — stopping on the attempts budget — is legible rather than mysterious. Learn the honest algorithm first; reach for the faster cousins when you can say exactly which trade you are making."
          ],
          "worked": [
            {"problem": "An artist wants the densest possible packing of identical circles for a print texture and does not care about code simplicity. Which method, and why?",
             "solution": "Front-chain packing: placing each circle tangent to two existing circles achieves near-maximal density for equal circles, and the tangency seams read as intentional craft in a print. Poisson-disc would be the wrong choice here — its minimum-distance guarantee caps density below what tangency achieves."}
          ],
          "checks": [
            {"q": "What does Poisson-disc sampling guarantee that plain rejection sampling does not?", "a": "A minimum spacing between samples (even 'blue noise' coverage) with far fewer wasted candidates, via the active-list ring proposal."},
            {"q": "Why does this course's playground use rejection sampling instead of the faster methods?", "a": "It is obviously correct and easy to reason about, its gap control permits the overlapping loopy look, and its stopping behavior is legible — the right teaching trade."}
          ]
        }
      ]
    },
    {
      "id": "parameters-design-language",
      "title": "Parameters as a Design Language",
      "kind": "lab",
      "lab": {"url": "lab-generative-packing.html", "label": "Open the packing playground"},
      "topics": ["Span (spacing)", "Factor (size falloff)", "NC (hue layers)", "Alpha (opacity)", "AngleX/AngleY (field tilt)", "Blend modes", "Seeded variation"],
      "il_provides": "A parameter-by-parameter reading of the packing controls — Span, Factor, NC, Alpha, AngleX, AngleY, BLEND — each explained as a design decision with its range, its default, and what breaks when you push it. Every lesson is taught against the interactive playground, where each slider is live and every seed is reproducible.",
      "sources": [
        {"name": "Pattlas — “7月16日” by Hitoshi Takagi", "url": PATT, "note": "Source of the parameter vocabulary: TEXT “_circle”, Span 28 (1–100), Factor 15 (0–100), NC 3 (1–99), Alpha 255 (0–255), AngleX 1.1 (−3.2–3.2), AngleY 1.2 (−3.2–3.2), BLEND “blend”. We interpret each parameter in our own words; the mapping is ours."},
        {"name": "MDN — CanvasRenderingContext2D.globalCompositeOperation", "url": "https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation", "note": "Reference for the blend modes the playground exposes (source-over, lighter, multiply, screen)."}
      ],
      "lessons": [
        {
          "title": "Span: the breathing room",
          "body": [
            "Span sets the minimum gap the packer enforces between circles, on a 1–100 scale with a default of 28. Think of it as the field's breathing room. At low Span the circles crowd until they foam — edges kiss, gaps shrink to slivers, the field reads as a single continuous surface. At high Span each circle stands apart and the composition becomes a constellation: the negative space does half the talking.",
            "Span also quietly controls quantity. A crowded field fits fewer large circles before the attempts budget runs out; a sparse field places its target count easily. In the playground the target count scales down as Span rises, which mirrors the real constraint: breathing room costs circles.",
            "The useful discipline is to change Span alone, with a fixed seed, and watch the field reorganize. Same circles, same positions proposed — only the acceptance rule changes. That isolation is the whole method of this module: one axis at a time, seed fixed, eyes open."
          ],
          "worked": [
            {"problem": "With seed fixed, you raise Span from 28 to 70 and the field looks emptier but also calmer. Explain both effects.",
             "solution": "Emptier: the larger enforced gap rejects more candidates, so fewer circles survive to the target — and the playground also lowers the target count. Calmer: wide even gaps remove the visual tension of near-touches; the eye stops hunting for collisions and reads the field as orderly. Same seed, so every surviving circle sits where it would have — Span only decided who survives."}
          ],
          "checks": [
            {"q": "What happens to circle count as Span increases, and why?", "a": "It falls: bigger enforced gaps reject more candidates, and the playground scales the target count down with Span."},
            {"q": "Why fix the seed when studying Span?", "a": "To isolate the variable — with the seed fixed, differences in the output come only from the Span change, not from new random proposals."}
          ]
        },
        {
          "title": "Factor: how size falls off",
          "body": [
            "Factor controls the size falloff across placement order, on a 0–100 scale defaulting to 15. The packer places large circles first and shrinks as it goes; Factor sets how steeply. At Factor 0 the decay is gentle — circles stay near their maximum size throughout, and the field feels monumental, almost architectural. At Factor 100 the radius collapses exponentially: a few giants, then a cascade of ever-smaller circles filling the interstices, the classic 'Soddy circles' cascade look.",
            "This is a compositional lever disguised as a number. Large-to-small cascades create depth — the eye reads big circles as near and small ones as far, even on a flat canvas. Uniform sizes read as pattern; graded sizes read as space. The reference piece uses a mild Factor of 15: enough grading to feel grown rather than stamped, not so much that the small circles dissolve into noise.",
            "Watch for the failure mode at extreme Factor: the tail of tiny circles can shrink below a pixel and contribute nothing but render cost. The playground clamps radius at a minimum so the tail stays visible as texture rather than vanishing."
          ],
          "worked": [
            {"problem": "You want a field that reads as deep space — a few near giants and a receding crowd. Which way do you push Factor, and what do you watch out for?",
             "solution": "Push Factor up (toward 60–100) for the steep cascade. Watch the tail: if the smallest circles vanish, you have texture budget spent on invisible marks — either accept the clamp or lower Factor until the smallest visible circle still reads at your display size."}
          ],
          "checks": [
            {"q": "What does Factor 0 produce, visually?", "a": "Near-uniform circle sizes — a monumental, architectural field with little size grading."},
            {"q": "Why does size grading create a sense of depth?", "a": "The eye interprets larger marks as nearer and smaller marks as farther, even on a flat surface."}
          ]
        },
        {
          "title": "NC and Alpha: building the violet field",
          "body": [
            "NC sets the number of hue layers in the palette, from 1 to 99, defaulting to 3. With NC=3 the playground distributes circles across three violet-family hues — a blue-violet, a true violet, a magenta-violet — cycling by placement order. One layer is monochrome discipline; many layers approach a spectrum. The reference piece lives in violet, and three layers are enough to keep violet from going flat: the eye needs slight hue disagreement to perceive richness.",
            "Alpha is opacity on a 0–255 scale, defaulting to 255 (fully opaque strokes). This is where the loops come from. Drop Alpha and overlapping strokes start to blend: intersections darken or glow depending on the blend mode, and the field gains the layered translucency of the reference piece. Alpha is the cheapest way to buy depth — no geometry changes, just ink behavior.",
            "The two interact. High NC with low Alpha produces a watercolor wash of hues; low NC with full Alpha produces crisp graphic rings. The default — three hues, full opacity — is the bold poster look: every circle declares itself. Your studies should visit all four corners of this little square before settling anywhere."
          ],
          "worked": [
            {"problem": "Your field looks flat despite three hue layers. You may change one parameter. What do you try first and why?",
             "solution": "Lower Alpha. Flatness here is a layering problem, not a hue problem: at full opacity every stroke occludes rather than blends, so overlaps read as edges instead of depth. Dropping Alpha lets intersections accumulate tone, which is what the eye reads as depth."}
          ],
          "checks": [
            {"q": "What does NC control, and what is its default?", "a": "The number of hue layers cycling through the palette; default 3, in the violet family."},
            {"q": "Why does lowering Alpha add depth without changing any geometry?", "a": "Translucent strokes accumulate tone where they overlap, so intersections read as layering rather than occlusion."}
          ]
        },
        {
          "title": "AngleX, AngleY, and BLEND",
          "body": [
            "AngleX and AngleY tilt the finished field, each on a −3.2 to 3.2 scale (roughly −π to π), defaulting to 1.1 and 1.2. After packing, every circle center is rotated about the canvas center by the average of the two angles. Small values produce a gentle drift — the field leans. Large values swing the composition dramatically and crop circles hard against the edges, which is a legitimate compositional device: the crop implies a field larger than the frame.",
            "Two angles instead of one is a small generosity: their average sets the rotation while their difference is available as future expressiveness (in our mapping the average does the work; the pair is kept because the reference vocabulary has the pair). The lesson is about reading, not just using — parameter blocks often carry more joints than the current mapping exercises.",
            "BLEND selects the canvas compositing mode. “blend” is the default source-over: new strokes cover old. “lighter” adds light — overlaps glow toward white, the neon look. “multiply” darkens intersections toward the ink color, the print look. “screen” is lighter's gentler cousin. Blend modes cost nothing to try and change everything about overlap: run the same seed through all four before you decide the piece is finished."
          ],
          "worked": [
            {"problem": "Same seed, same parameters, you switch BLEND from “blend” to “lighter” and the piece transforms from poster to neon sign. Explain.",
             "solution": "Source-over occludes: each stroke covers what is beneath, so overlaps are just edges. Lighter adds pixel values: where strokes cross, light accumulates and intersections bloom toward white. The geometry never moved — only the arithmetic of overlap changed — which is why blend mode is the highest-leverage single parameter in the block."}
          ],
          "checks": [
            {"q": "What do AngleX/AngleY do after packing, and what is the compositional effect of large values?", "a": "They rotate the field about the canvas center; large values crop circles hard against the edges, implying a field larger than the frame."},
            {"q": "Contrast “lighter” and “multiply” on overlapping strokes.", "a": "Lighter adds light — intersections glow toward white (neon). Multiply darkens — intersections deepen toward the ink (print)."}
          ]
        }
      ]
    },
    {
      "id": "reading-generative-work",
      "title": "Reading Generative Work",
      "kind": "core",
      "topics": ["Attribution", "Inspired-by vs copied", "Reading parameter blocks", "Lab notebook practice", "Three studies"],
      "il_provides": "The ethics and the craft of working from inspiration: honest attribution of the Pattlas piece, the line between inspired-by and copied, how to read any parameter block as a set of intentions, and a lab-notebook practice that turns tinkering into study.",
      "sources": [
        {"name": "Pattlas — “7月16日” by Hitoshi Takagi", "url": PATT, "note": "The attributed inspiration for this course. View it, credit it, do not reproduce it."}
      ],
      "lessons": [
        {
          "title": "Credit where it is due",
          "body": [
            "This course exists because of a specific artwork: “7月16日” (“July 16th”) by Hitoshi Takagi, published on the creative-coding platform Pattlas. Its parameter block — TEXT “_circle”, Span 28, Factor 15, NC 3, Alpha 255, AngleX 1.1, AngleY 1.2, BLEND “blend” — is the vocabulary this course teaches you to read. That debt is recorded here, on the playground page, and in the course sources, because generative art is a community conversation and conversations name their speakers.",
            "Here is the line we walked, stated plainly so you can walk it too. Inspired-by: taking the parameter vocabulary and the violet-field mood as a starting point, then writing our own packing algorithm, our own parameter mappings, and our own prose. Copied would have been: reproducing the artwork's image, reimplementing its exact renderer from decompiled source, or presenting its look as our invention. We did none of those things.",
            "The rule generalizes: parameters and ideas are fair material; images and code are someone's work. When you publish studies made in the playground, credit the chain — the playground, this course, and Takagi's piece. Attribution costs nothing and buys you membership in the community you are learning from."
          ],
          "worked": [
            {"problem": "A student recreates the reference piece's exact look by screenshotting it and tracing the circles. They credit Takagi. Acceptable?",
             "solution": "No. Credit does not cure reproduction: the image itself is the artist's work, and tracing it bypasses the entire generative procedure the course teaches. The honest path is to write a packer, tune parameters toward the mood, and credit the inspiration — process, not pixels."}
          ],
          "checks": [
            {"q": "What did this course take from Takagi's piece, and what did it build itself?", "a": "Taken: the parameter vocabulary and the violet-field mood, with attribution. Built: our own packing algorithm, our own parameter mappings, our own prose."},
            {"q": "Why doesn't credit alone make tracing the artwork acceptable?", "a": "Because the image is the artist's work — credit cures omission, not reproduction. The generative path is to write your own procedure."}
          ]
        },
        {
          "title": "Parameters are intentions",
          "body": [
            "Read a parameter block the way you would read an artist's statement. Defaults are the artist's voice: Span 28 says 'dense but breathing'; Factor 15 says 'graded, not cascading'; NC 3 says 'violet, but alive'; Alpha 255 says 'bold, every mark declares itself'; the tilt pair says 'the field leans, it is not axis-bound'. Eight numbers, and you already know the piece before it renders.",
            "Ranges are the edges of the artist's curiosity: Span 1–100 admits both foam and constellation; angles spanning −π to π admit the full circle of tilts. A parameter the artist bothered to expose is a dimension they thought was worth playing — treat each exposed control as an invitation, and each fixed constant as a decision already made for you.",
            "Your lab notebook practice: for every study, record seed, all eight parameters, and one sentence on what you were testing. After twenty studies you will own something no tutorial gives you — a personal map of the parameter space, with your taste marked on it."
          ],
          "checks": [
            {"q": "What do a parameter block's defaults tell you?", "a": "The artist's voice — the default composition they consider the piece's home, readable as a set of design intentions."},
            {"q": "What should a lab notebook entry contain?", "a": "Seed, all parameter values, and one sentence stating what was being tested."}
          ]
        },
        {
          "title": "Your first three studies",
          "body": [
            "The course ends where studio courses should: with assignments, not summaries. Produce three studies in the playground, each varying primarily one axis, each with a notebook entry.",
            "Study one, the foam: drive Span low (5–12), keep everything else near default. You are testing how dense the field gets before the attempts budget gives up — note where the rejections start winning. Study two, the constellation: Span high (60–85), Alpha down to ~140, BLEND on lighter. You are testing whether sparse marks with glowing intersections can carry a composition. Study three, the tilt: push AngleX and AngleY past 2.0 in opposite signs and watch the crop. You are testing the frame as a compositional tool.",
            "Bring the three studies and their notebook entries to the gate assessment. The questions test whether you can predict what a parameter change will do — which is simply the notebook habit, examined."
          ],
          "checks": [
            {"q": "For the 'foam' study, which parameter moves and what are you observing?", "a": "Span moves low (5–12); you observe density rising until the attempts budget starts winning and placements stall."}
          ]
        }
      ]
    }
  ],
  "assessments": [
    {
      "id": "il03-packing-gate",
      "title": "Circle Packing Studio Gate",
      "kind": "gate",
      "minutes": 20,
      "questions": 10,
      "items": [
        {"q": "Rejection sampling places a circle by", "choices": ["proposing a random candidate and keeping it only if it clears the overlap test", "growing circles until they touch, then freezing them", "sorting candidates by radius before placing any", "reflecting rejected candidates across the canvas center"], "answer": 0, "explain": "Propose, test against placed circles, accept or reject — the honest algorithm from Module 1.", "topic": "rejection-sampling"},
        {"q": "Why does the playground use a seeded random generator?", "choices": ["It renders faster than unseeded randomness", "It guarantees denser packing", "The same seed reproduces the same field, isolating parameter effects", "Browsers require seeds for canvas work"], "answer": 2, "explain": "Reproducibility: with the seed fixed, any visible change comes from the parameter you changed.", "topic": "seeded-randomness"},
        {"q": "A spatial grid changes rejection sampling's", "choices": ["accepted set of circles", "speed, by skipping far-away overlap tests", "color palette", "stopping rule"], "answer": 1, "explain": "The result is identical; only the bookkeeping gets faster.", "topic": "spatial-grids"},
        {"q": "Raising Span from 28 to 70 will", "choices": ["increase circle count and tension", "decrease circle count and calm the field", "rotate the field clockwise", "change the hue layers"], "answer": 1, "explain": "Bigger enforced gaps reject more candidates (fewer circles) and wide even gaps remove near-touch tension.", "topic": "span"},
        {"q": "Factor 100 produces", "choices": ["uniform circle sizes", "a steep large-to-small cascade", "a rotated field", "transparent strokes"], "answer": 1, "explain": "High Factor steepens the radius decay across placement order: giants first, then a collapsing tail.", "topic": "factor"},
        {"q": "Lowering Alpha adds depth because", "choices": ["circles get smaller", "overlapping strokes accumulate tone instead of occluding", "the hue layers multiply", "the field rotates"], "answer": 1, "explain": "Translucency turns intersections into layering rather than edges — depth without moving any geometry.", "topic": "alpha"},
        {"q": "Switching BLEND from “blend” to “lighter” makes intersections", "choices": ["disappear", "glow toward white as light accumulates", "turn black", "grow larger"], "answer": 1, "explain": "Lighter adds pixel values where strokes cross — the neon look, geometry untouched.", "topic": "blend"},
        {"q": "Large AngleX/AngleY values affect the composition by", "choices": ["changing the random seed", "rotating the field and cropping circles against the frame", "adding hue layers", "increasing the attempts budget"], "answer": 1, "explain": "Post-packing rotation about the canvas center; hard crops imply a field larger than the frame.", "topic": "angles"},
        {"q": "Poisson-disc sampling's advantage over plain rejection sampling is", "choices": ["it allows overlapping circles", "guaranteed minimum spacing with far fewer wasted candidates", "it needs no random generator", "it draws squares faster"], "answer": 1, "explain": "The active-list ring proposal enforces even 'blue noise' spacing efficiently.", "topic": "poisson-disc"},
        {"q": "Using Takagi's parameter vocabulary with your own packer and full attribution is", "choices": ["plagiarism, because the look is similar", "acceptable inspired-by practice: ideas and parameters are fair material, images and code are not", "only acceptable with written permission", "unnecessary — attribution is optional online"], "answer": 1, "explain": "The course's stated line: parameters and ideas are fair material with credit; reproducing the image or code is not.", "topic": "attribution"}
      ]
    }
  ]
}

def insert(into_path):
    with open(into_path, encoding="utf-8") as f:
        raw = f.read()
    data = json.loads(raw)
    ids = [p["id"] for p in data["paths"]]
    assert path["id"] not in ids, "path already present in " + into_path
    # shard-a.json carries academies too; keep its academies, append path
    data["paths"].append(copy.deepcopy(path))
    with open(into_path, "w", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=True))
    print("inserted into", into_path, "| paths now:", len(data["paths"]))

insert("/tmp/il-uni/data/catalog/shard-a.json")
insert("/tmp/il-uni/data/catalog.json")
print("OK")
