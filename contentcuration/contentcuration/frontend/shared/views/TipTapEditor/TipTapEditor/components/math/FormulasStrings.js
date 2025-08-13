import { createTranslator } from 'shared/i18n';

const NAMESPACE = 'FormulasStrings';

const MESSAGES = {
  // Category titles
  formulasCategory: {
    message: 'Formulas',
    context: 'Category title for formula symbols',
  },
  linesCategory: {
    message: 'Lines',
    context: 'Category title for line symbols',
  },
  basicCategory: {
    message: 'Basic',
    context: 'Category title for basic math symbols',
  },
  advancedCategory: {
    message: 'Advanced',
    context: 'Category title for advanced math symbols',
  },
  logicCategory: {
    message: 'Logic',
    context: 'Category title for logic symbols',
  },
  geometryCategory: {
    message: 'Geometry',
    context: 'Category title for geometry symbols',
  },
  setsCategory: {
    message: 'Sets',
    context: 'Category title for set theory symbols',
  },
  directionalCategory: {
    message: 'Directional',
    context: 'Category title for directional symbols',
  },
  charactersCategory: {
    message: 'Characters',
    context: 'Category title for Greek characters',
  },
  miscellaneousCategory: {
    message: 'Miscellaneous',
    context: 'Category title for miscellaneous symbols',
  },

  // Formula symbols
  superscript: {
    message: 'Superscript',
    context: 'Title for superscript symbol',
  },
  subscript: {
    message: 'Subscript',
    context: 'Title for subscript symbol',
  },
  fraction: {
    message: 'Fraction',
    context: 'Title for fraction symbol',
  },
  binomialCoefficient: {
    message: 'Binomial coefficient',
    context: 'Title for binomial coefficient symbol',
  },
  sum: {
    message: 'Sum',
    context: 'Title for sum symbol',
  },
  product: {
    message: 'Product',
    context: 'Title for product symbol',
  },
  coproduct: {
    message: 'Coproduct',
    context: 'Title for coproduct symbol',
  },
  integral: {
    message: 'Integral',
    context: 'Title for integral symbol',
  },

  // Lines symbols
  squareRoot: {
    message: 'Square root',
    context: 'Title for square root symbol',
  },
  bar: {
    message: 'Bar',
    context: 'Title for bar symbol',
  },
  underline: {
    message: 'Underline',
    context: 'Title for underline symbol',
  },
  leftArrow: {
    message: 'Left arrow',
    context: 'Title for left arrow symbol',
  },
  rightArrow: {
    message: 'Right arrow',
    context: 'Title for right arrow symbol',
  },
  vector: {
    message: 'Vector',
    context: 'Title for vector symbol',
  },

  // Basic symbols
  addition: {
    message: 'Addition',
    context: 'Title for addition symbol',
  },
  subtraction: {
    message: 'Subtraction',
    context: 'Title for subtraction symbol',
  },
  multiplication: {
    message: 'Multiplication',
    context: 'Title for multiplication symbol',
  },
  division: {
    message: 'Division',
    context: 'Title for division symbol',
  },
  dot: {
    message: 'Dot',
    context: 'Title for dot symbol',
  },
  negation: {
    message: 'Negation',
    context: 'Title for negation symbol',
  },
  plusMinus: {
    message: 'Plus-minus',
    context: 'Title for plus-minus symbol',
  },
  minusPlus: {
    message: 'Minus-plus',
    context: 'Title for minus-plus symbol',
  },
  doesNotEqual: {
    message: 'Does not equal',
    context: 'Title for does not equal symbol',
  },
  approximately: {
    message: 'Approximately',
    context: 'Title for approximately symbol',
  },
  proportional: {
    message: 'Proportional',
    context: 'Title for proportional symbol',
  },
  definition: {
    message: 'Definition',
    context: 'Title for definition symbol',
  },
  greaterThan: {
    message: 'Greater than',
    context: 'Title for greater than symbol',
  },
  greaterThanOrEqual: {
    message: 'Greater than or equal to',
    context: 'Title for greater than or equal symbol',
  },
  notGreaterThan: {
    message: 'Not greater than',
    context: 'Title for not greater than symbol',
  },
  significantlyGreaterThan: {
    message: 'Significantly greater than',
    context: 'Title for significantly greater than symbol',
  },
  lessThan: {
    message: 'Less than',
    context: 'Title for less than symbol',
  },
  lessThanOrEqual: {
    message: 'Less than or equal to',
    context: 'Title for less than or equal symbol',
  },
  notLessThan: {
    message: 'Not less than',
    context: 'Title for not less than symbol',
  },
  significantlyLessThan: {
    message: 'Significantly less than',
    context: 'Title for significantly less than symbol',
  },
  leftCeiling: {
    message: 'Left ceiling',
    context: 'Title for left ceiling symbol',
  },
  leftFloor: {
    message: 'Left floor',
    context: 'Title for left floor symbol',
  },
  rightCeiling: {
    message: 'Right ceiling',
    context: 'Title for right ceiling symbol',
  },
  rightFloor: {
    message: 'Right floor',
    context: 'Title for right floor symbol',
  },

  // Advanced symbols
  tensorProduct: {
    message: 'Tensor product',
    context: 'Title for tensor product symbol',
  },
  contourIntegral: {
    message: 'Contour integral',
    context: 'Title for contour integral symbol',
  },
  nabla: {
    message: 'Nabla',
    context: 'Title for nabla symbol',
  },
  conjugate: {
    message: 'Conjugate',
    context: 'Title for conjugate symbol',
  },
  conjugateTranspose: {
    message: 'Conjugate transpose',
    context: 'Title for conjugate transpose symbol',
  },
  partial: {
    message: 'Partial',
    context: 'Title for partial symbol',
  },
  wedgeProduct: {
    message: 'Wedge product',
    context: 'Title for wedge product symbol',
  },
  infinity: {
    message: 'Infinity',
    context: 'Title for infinity symbol',
  },
  topElement: {
    message: 'Top element',
    context: 'Title for top element symbol',
  },
  reducibleTo: {
    message: 'Reducible to',
    context: 'Title for reducible to symbol',
  },
  nondominatedBy: {
    message: 'Nondominated by',
    context: 'Title for nondominated by symbol',
  },

  // Logic symbols
  and: {
    message: 'And',
    context: 'Title for and symbol',
  },
  or: {
    message: 'Or',
    context: 'Title for or symbol',
  },
  ifAndOnlyIf: {
    message: 'If and only if',
    context: 'Title for if and only if symbol',
  },
  entails: {
    message: 'Entails',
    context: 'Title for entails symbol',
  },
  implies: {
    message: 'Implies',
    context: 'Title for implies symbol',
  },
  givenThat: {
    message: 'Given that/Such that',
    context: 'Title for given that symbol',
  },
  exists: {
    message: 'Exists',
    context: 'Title for exists symbol',
  },
  forAll: {
    message: 'For all',
    context: 'Title for for all symbol',
  },
  because: {
    message: 'Because',
    context: 'Title for because symbol',
  },
  therefore: {
    message: 'Therefore',
    context: 'Title for therefore symbol',
  },
  qed: {
    message: 'QED',
    context: 'Title for QED symbol',
  },
  exclusiveOr: {
    message: 'Exclusive or',
    context: 'Title for exclusive or symbol',
  },

  // Geometry symbols
  degrees: {
    message: 'Degrees',
    context: 'Title for degrees symbol',
  },
  angle: {
    message: 'Angle',
    context: 'Title for angle symbol',
  },
  measuredAngle: {
    message: 'Measured angle',
    context: 'Title for measured angle symbol',
  },
  parallel: {
    message: 'Parallel',
    context: 'Title for parallel symbol',
  },
  perpendicular: {
    message: 'Perpendicular',
    context: 'Title for perpendicular symbol',
  },
  incomparableTo: {
    message: 'Incomparable to',
    context: 'Title for incomparable to symbol',
  },
  similarTo: {
    message: 'Similar to',
    context: 'Title for similar to symbol',
  },
  similarOrEqual: {
    message: 'Similar or equal to',
    context: 'Title for similar or equal symbol',
  },
  congruentTo: {
    message: 'Congruent to',
    context: 'Title for congruent to symbol',
  },

  // Sets symbols
  ellipsis: {
    message: 'Ellipsis',
    context: 'Title for ellipsis symbol',
  },
  ellipsisVertical: {
    message: 'Ellipsis (vertical)',
    context: 'Title for vertical ellipsis symbol',
  },
  ellipsisCentered: {
    message: 'Ellipsis (centered)',
    context: 'Title for centered ellipsis symbol',
  },
  ellipsisDiagonal: {
    message: 'Ellipsis (diagonal)',
    context: 'Title for diagonal ellipsis symbol',
  },
  cardinality: {
    message: 'Cardinality',
    context: 'Title for cardinality symbol',
  },
  intersection: {
    message: 'Intersection',
    context: 'Title for intersection symbol',
  },
  union: {
    message: 'Union',
    context: 'Title for union symbol',
  },
  emptySet: {
    message: 'Empty set',
    context: 'Title for empty set symbol',
  },
  in: {
    message: 'In',
    context: 'Title for in symbol',
  },
  notIn: {
    message: 'Not in',
    context: 'Title for not in symbol',
  },
  contains: {
    message: 'Contains',
    context: 'Title for contains symbol',
  },
  symmetricDifference: {
    message: 'Symmetric difference',
    context: 'Title for symmetric difference symbol',
  },
  setDifference: {
    message: 'Set difference',
    context: 'Title for set difference symbol',
  },
  subset: {
    message: 'Subset',
    context: 'Title for subset symbol',
  },
  subsetOrEqual: {
    message: 'Subset or equal',
    context: 'Title for subset or equal symbol',
  },
  notSubsetOrEqual: {
    message: 'Not a subset or equal',
    context: 'Title for not subset or equal symbol',
  },
  superset: {
    message: 'Superset',
    context: 'Title for superset symbol',
  },
  supersetOrEqual: {
    message: 'Superset or equal',
    context: 'Title for superset or equal symbol',
  },
  notSupersetOrEqual: {
    message: 'Not a superset or equal',
    context: 'Title for not superset or equal symbol',
  },
  wreathProduct: {
    message: 'Wreath product',
    context: 'Title for wreath product symbol',
  },
  naturalJoin: {
    message: 'Natural join',
    context: 'Title for natural join symbol',
  },

  // Directional symbols
  down: {
    message: 'Down',
    context: 'Title for down arrow symbol',
  },
  downDouble: {
    message: 'Down (double)',
    context: 'Title for double down arrow symbol',
  },
  triangleDown: {
    message: 'Triangle down',
    context: 'Title for triangle down symbol',
  },
  up: {
    message: 'Up',
    context: 'Title for up arrow symbol',
  },
  upDouble: {
    message: 'Up (double)',
    context: 'Title for double up arrow symbol',
  },
  triangleUp: {
    message: 'Triangle up',
    context: 'Title for triangle up symbol',
  },
  upDown: {
    message: 'Up-down',
    context: 'Title for up-down arrow symbol',
  },
  upDownDouble: {
    message: 'Up-down (double)',
    context: 'Title for double up-down arrow symbol',
  },
  left: {
    message: 'Left',
    context: 'Title for left arrow symbol',
  },
  leftDouble: {
    message: 'Left (double)',
    context: 'Title for double left arrow symbol',
  },
  leftLong: {
    message: 'Left (long)',
    context: 'Title for long left arrow symbol',
  },
  leftLongDouble: {
    message: 'Left (long, double)',
    context: 'Title for long double left arrow symbol',
  },
  leftHooked: {
    message: 'Left (hooked)',
    context: 'Title for hooked left arrow symbol',
  },
  leftHarpoonDown: {
    message: 'Left (harpoon down)',
    context: 'Title for left harpoon down symbol',
  },
  leftHarpoonUp: {
    message: 'Left (harpoon up)',
    context: 'Title for left harpoon up symbol',
  },
  right: {
    message: 'Right',
    context: 'Title for right arrow symbol',
  },
  rightDouble: {
    message: 'Right (double)',
    context: 'Title for double right arrow symbol',
  },
  rightLong: {
    message: 'Right (long)',
    context: 'Title for long right arrow symbol',
  },
  rightLongDouble: {
    message: 'Right (long, double)',
    context: 'Title for long double right arrow symbol',
  },
  rightHooked: {
    message: 'Right (hooked)',
    context: 'Title for hooked right arrow symbol',
  },
  rightHarpoonDown: {
    message: 'Right (harpoon down)',
    context: 'Title for right harpoon down symbol',
  },
  rightHarpoonUp: {
    message: 'Right (harpoon up)',
    context: 'Title for right harpoon up symbol',
  },
  leftRight: {
    message: 'Left-right',
    context: 'Title for left-right arrow symbol',
  },
  leftRightDouble: {
    message: 'Left-right (double)',
    context: 'Title for double left-right arrow symbol',
  },
  leftRightLong: {
    message: 'Left-right (long)',
    context: 'Title for long left-right arrow symbol',
  },
  leftRightLongDouble: {
    message: 'Left-right (long, double)',
    context: 'Title for long double left-right arrow symbol',
  },
  northeast: {
    message: 'Northeast',
    context: 'Title for northeast arrow symbol',
  },
  northwest: {
    message: 'Northwest',
    context: 'Title for northwest arrow symbol',
  },
  southeast: {
    message: 'Southeast',
    context: 'Title for southeast arrow symbol',
  },
  southwest: {
    message: 'Southwest',
    context: 'Title for southwest arrow symbol',
  },

  // Greek characters
  alpha: {
    message: 'alpha',
    context: 'Title for alpha character',
  },
  beta: {
    message: 'beta',
    context: 'Title for beta character',
  },
  chi: {
    message: 'chi',
    context: 'Title for chi character',
  },
  delta: {
    message: 'delta',
    context: 'Title for delta character',
  },
  deltaCapital: {
    message: 'Delta',
    context: 'Title for capital Delta character',
  },
  digamma: {
    message: 'digamma',
    context: 'Title for digamma character',
  },
  ell: {
    message: 'ell',
    context: 'Title for ell character',
  },
  epsilon: {
    message: 'epsilon',
    context: 'Title for epsilon character',
  },
  eta: {
    message: 'eta',
    context: 'Title for eta character',
  },
  gamma: {
    message: 'gamma',
    context: 'Title for gamma character',
  },
  gammaCapital: {
    message: 'Gamma',
    context: 'Title for capital Gamma character',
  },
  planckConstant: {
    message: "Planck's constant",
    context: 'Title for Planck constant character',
  },
  iota: {
    message: 'iota',
    context: 'Title for iota character',
  },
  kappa: {
    message: 'kappa',
    context: 'Title for kappa character',
  },
  lambda: {
    message: 'lambda',
    context: 'Title for lambda character',
  },
  lambdaCapital: {
    message: 'Lambda',
    context: 'Title for capital Lambda character',
  },
  mu: {
    message: 'mu',
    context: 'Title for mu character',
  },
  nu: {
    message: 'nu',
    context: 'Title for nu character',
  },
  omega: {
    message: 'omega',
    context: 'Title for omega character',
  },
  omegaCapital: {
    message: 'Omega',
    context: 'Title for capital Omega character',
  },
  phi: {
    message: 'phi',
    context: 'Title for phi character',
  },
  phiCapital: {
    message: 'Phi',
    context: 'Title for capital Phi character',
  },
  pi: {
    message: 'pi',
    context: 'Title for pi character',
  },
  piCapital: {
    message: 'Pi',
    context: 'Title for capital Pi character',
  },
  psi: {
    message: 'psi',
    context: 'Title for psi character',
  },
  psiCapital: {
    message: 'Psi',
    context: 'Title for capital Psi character',
  },
  rho: {
    message: 'rho',
    context: 'Title for rho character',
  },
  sigma: {
    message: 'sigma',
    context: 'Title for sigma character',
  },
  sigmaCapital: {
    message: 'Sigma',
    context: 'Title for capital Sigma character',
  },
  tau: {
    message: 'tau',
    context: 'Title for tau character',
  },
  theta: {
    message: 'theta',
    context: 'Title for theta character',
  },
  thetaCapital: {
    message: 'Theta',
    context: 'Title for capital Theta character',
  },
  upsilon: {
    message: 'upsilon',
    context: 'Title for upsilon character',
  },
  upsilonCapital: {
    message: 'Upsilon',
    context: 'Title for capital Upsilon character',
  },
  pWeierstrass: {
    message: 'P',
    context: 'Title for Weierstrass P character',
  },
  xi: {
    message: 'xi',
    context: 'Title for xi character',
  },
  xiCapital: {
    message: 'Xi',
    context: 'Title for capital Xi character',
  },
  zeta: {
    message: 'zeta',
    context: 'Title for zeta character',
  },

  // Miscellaneous symbols
  circle: {
    message: 'Circle',
    context: 'Title for circle symbol',
  },
  club: {
    message: 'Club',
    context: 'Title for club symbol',
  },
  diamond: {
    message: 'Diamond',
    context: 'Title for diamond symbol',
  },
  heart: {
    message: 'Heart',
    context: 'Title for heart symbol',
  },
  spade: {
    message: 'Spade',
    context: 'Title for spade symbol',
  },
  flat: {
    message: 'Flat',
    context: 'Title for flat symbol',
  },
  natural: {
    message: 'Natural',
    context: 'Title for natural symbol',
  },
  sharp: {
    message: 'Sharp',
    context: 'Title for sharp symbol',
  },
};

let FormulasStrings = null;

export function getFormulasStrings() {
  if (!FormulasStrings) {
    FormulasStrings = createTranslator(NAMESPACE, MESSAGES);
  }
  return FormulasStrings;
}
