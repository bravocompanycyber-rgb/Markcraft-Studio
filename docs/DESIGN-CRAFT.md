# Traditional Logo Craft (encoded in Markcraft)

Markcraft's **Designer craft** engine follows methods used by professionals long before AI:

## Core principles
1. **Simplicity** — one idea, few forms
2. **Memorability** — distinctive silhouette
3. **Timelessness** — geometry over trends
4. **Versatility** — works small, one-color, reversed
5. **Appropriateness** — fits industry without cliché

## Construction methods used
| Method | Tradition |
|--------|-----------|
| Lettermark | Paul Rand, institutional marks |
| Monogram overlap | Banks, law firms, heritage brands |
| Seal / crest | Education, government, heritage |
| Geometric icon | Modern classics (Chase, Mitsubishi…) |
| Negative space | Clever figure-ground (FedEx arrow school) |
| Swoosh / motion | Sports, transport |
| Pillar / structure | Architecture, law |
| Leaf organic | Health, food, nature (simplified) |

## Proportion
- Golden ratio (φ) used in nested forms
- Optical centering and balanced tracking
- Stroke weights thick enough for small sizes

## Industry conventions
The craft engine picks methods the way a studio would brief a designer — tech leans geometric, law leans seal/pillar, food leans organic leaf, finance leans lettermark/monogram.

## 1.2 — How concepts are composed

Each concept is a recipe: `layout · icon · frame · fill · finish · backdrop · badgeIcon · ornament · font pairing · name styling · colour roles`.
The generator picks recipes from the personality's preference table and the industry's icon list, and guarantees that the 4 concepts in a round differ in layout, icon and frame, and that no recipe is ever shown twice in a session.
Rendering measures every text run first (canvas `measureText`), builds the lockup in local units, then scales it to fit the artboard, so nothing can overlap or clip.
