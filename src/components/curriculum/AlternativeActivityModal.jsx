import { useEffect, useState } from 'react'
import Modal from '../common/Modal'
import AIButton from '../common/AIButton'
import AIResponseCard from '../common/AIResponseCard'
import { useAI } from '../../hooks/useAI'
import { buildAlternativeRecommendPrompt } from '../../services/aiPrompts'

const DIFFICULTY_LABEL = {
  1: '쉬움',
  2: '보통',
  3: '어려움',
}

const QUICK_PRESETS = {
  marker: {
    label: '원마커 회수 변형',
    name: '원마커 회수 대체 활동',
    source: '교사 템플릿',
    difficulty: 2,
    durationMin: 40,
    space: '운동장, 체육관, 교실',
    group: { min: 12, max: 30 },
    equipment: '공, 원마커, 라인콘',
    fmsCategories: '조작',
    fmsSkills: '던지기, 받기',
    fitnessComponents: '협응성, 민첩성',
    intro: {
      minutes: 5,
      flow: ['안전 안내', '도입 퀵 게임(1라운드)', '오늘 목표 확인'],
      metaQuestion: '어느 순간에 동작이 가장 안정적이었나?',
    },
    acquire: {
      minutes: 10,
      goal: '기본 던지기-받기 동작을 정확하고 부드럽게 반복한다.',
      drills: [
        { name: '기본 패스 드릴', description: '2m 거리 짝 패스를 3회 반복하고 바로 받아본다.' },
        { name: '수비·회수 드릴', description: '받은 뒤 즉시 제자리에서 대기 없이 이동한다.' },
      ],
      feedback: ['손목 각도와 시선을 안정화한다.', '받기 전에 몸을 고정한다.'],
    },
    challenge: {
      minutes: 12,
      goal: '호루라기 신호에 맞춰 역할이 바뀌어도 흐름을 유지한다.',
      missions: [
        { name: '대기-발사 미션', description: '교대 신호가 울리면 바로 파트너를 바꿔 패스를 시작한다.', minutes: 4 },
        { name: '원마커 회수 미션', description: '원마커 1개 회수 후 팀 베이스로 복귀한다.', minutes: 4 },
        { name: '연속회수 미션', description: '호루라기 전 원마커를 더 많이 가져온 조를 선정한다.', minutes: 4 },
      ],
      feedback: ['시간에 쫓기지 않고 안정적으로 패스한다.', '누적 성공 수보다 동선의 질을 먼저 본다.'],
      scaffolding: {
        down: '거리 축소·교대 횟수 축소',
        up: '교대 신호 간격 단축·역할 제약 추가',
      },
    },
    engage: {
      minutes: 7,
      goal: '배운 동작을 팀 게임으로 적용한다.',
      game: {
        name: '원마커 회수 게임',
        description: '역할이 순환되는 술래+회수 복합 게임',
        rules: ['호루라기 전까지 패스와 이동의 리듬을 지킨다.', '원마커를 획득한 팀은 베이스로 먼저 귀환한다.'],
        scaffolding: {
          down: '교대 횟수 감소, 회수수 2개로 제한',
          up: '회수물 수를 늘리거나 시간 제한 추가',
        },
      },
      variation: '마지막 1분은 타이머 스프린트',
      feedback: ['안전 우선, 과속 금지'],
    },
    wrapup: {
      minutes: 6,
      flow: ['호흡 안정', '성공 사례 1개 회고', '다음 차시 미리보기'],
      metaQuestion: '어떤 때 역할 전환이 가장 부드러웠을까?',
      nextPreview: '다음 차시에는 패스 거리와 회수 전략을 하나씩 늘린다.',
      safetyNote: '라인 근처 밀집 금지, 호루라기 신호를 최우선으로 준수.',
    },
  },
  basic: {
    label: '간단 기본 템플릿',
    name: 'ACE 기본 대체 활동',
    source: '교사 템플릿',
    difficulty: 1,
    durationMin: 40,
    space: '교실, 체육관',
    group: { min: 2, max: 20 },
    equipment: '공',
    fmsCategories: '조작',
    fmsSkills: '받기',
    fitnessComponents: '협응성',
    intro: {
      minutes: 6,
      flow: ['도입 멘트', '안전 동선 정리', '활동 규칙 확인'],
      metaQuestion: '오늘 핵심은 무엇일까?',
    },
    acquire: {
      minutes: 10,
      goal: '기본 동작을 반복해 정확도를 올린다.',
      drills: [
        { name: '기초 리드', description: '교사 시범 후 개인 3회 반복한다.' },
        { name: '조합 반복', description: '동작을 반대로 이어서 수행한다.' },
      ],
      feedback: ['호흡 리듬 정리', '시선 고정'],
    },
    challenge: {
      minutes: 10,
      goal: '간단한 미션으로 동작 적용을 연습한다.',
      missions: [
        { name: '정확도 미션', description: '규칙을 지켜 5번 정확한 전달 성공.', minutes: 4 },
        { name: '협력 미션', description: '교대 없이 30초 연속 동작 수행.', minutes: 6 },
      ],
      feedback: ['실패 후 즉시 동선 복구', '개인 속도보다 정확도 우선'],
      scaffolding: {
        down: '미션 목표 수 감소, 거리/회수 수 감소',
        up: '목표 수 증가, 이동 거리 확대',
      },
    },
    engage: {
      minutes: 8,
      goal: '게임 맥락에서 동작을 사용한다.',
      game: {
        name: '기본 적용 게임',
        description: '게임 규칙에 맞춰 동일 동작을 반복 적용',
        rules: ['2분 라운드 반복', '성공 시 점수 기록'],
        scaffolding: {
          down: '판단 조건 완화',
          up: '시간 제한 추가 및 목표 수 증가',
        },
      },
      variation: '참여 모둠을 번갈아 운영',
      feedback: ['교정 포인트를 즉시 반복한다'],
    },
    wrapup: {
      minutes: 6,
      flow: ['정리운동', '개선점 1개 적기', '다음 차시 예고'],
      metaQuestion: '무엇이 가장 잘 되었나?',
      nextPreview: '다음 차시에는 난이도를 한 단계 올린다.',
      safetyNote: '과밀 구간은 즉시 분산한다.',
    },
  },
}

function splitLines(value = '') {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseCommaList(value = '') {
  return value
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function parseNamedList(value = '', fallback = []) {
  const lines = splitLines(value)
  if (!lines.length) return fallback

  return lines.map((line) => {
    const [name, ...description] = line.split(':')
    return {
      name: name.trim() || '항목',
      description: description.join(':').trim() || name.trim(),
    }
  })
}

function clampNum(value, min, max, fallback = min) {
  const next = Number(value)
  if (Number.isNaN(next)) return fallback
  if (next < min) return min
  if (next > max) return max
  return next
}

function toMinutes(value, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function Field({ label, required = false, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-gray-700 mb-1">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  )
}

function TextInput(props) {
  return (
    <input
      {...props}
      type="text"
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
    />
  )
}

function NumInput({ suffix = '분', ...props }) {
  return (
    <div className="flex items-center gap-2">
      <input
        {...props}
        type="number"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
      />
      <span className="text-xs text-gray-500">{suffix}</span>
    </div>
  )
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      rows={3}
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
    />
  )
}

function applyPresetToState(setters, presetId) {
  const preset = QUICK_PRESETS[presetId]
  if (!preset) return

  setters.setName(preset.name)
  setters.setSource(preset.source)
  setters.setDifficulty(String(preset.difficulty))
  setters.setDurationMin(String(preset.durationMin))
  setters.setSpace(preset.space)
  setters.setGroupMin(String(preset.group.min))
  setters.setGroupMax(String(preset.group.max))
  setters.setEquipment(preset.equipment)
  setters.setFmsCategories(preset.fmsCategories)
  setters.setFmsSkills(preset.fmsSkills)
  setters.setFitnessComponents(preset.fitnessComponents)

  setters.setIntroMinutes(String(preset.intro.minutes))
  setters.setAcquireMinutes(String(preset.acquire.minutes))
  setters.setChallengeMinutes(String(preset.challenge.minutes))
  setters.setEngageMinutes(String(preset.engage.minutes))
  setters.setWrapupMinutes(String(preset.wrapup.minutes))

  setters.setIntroFlow(preset.intro.flow.join('\n'))
  setters.setIntroMeta(preset.intro.metaQuestion)
  setters.setAcquireGoal(preset.acquire.goal)
  setters.setAcquireDrills(
    preset.acquire.drills.map((d) => `${d.name}: ${d.description}`).join('\n')
  )
  setters.setAcquireFeedback((preset.acquire.feedback || []).join('\n'))
  setters.setChallengeGoal(preset.challenge.goal)
  setters.setChallengeMissions(
    preset.challenge.missions.map((m) => `${m.name}: ${m.description} (${m.minutes}분)`).join('\n')
  )
  setters.setChallengeFeedback((preset.challenge.feedback || []).join('\n'))
  setters.setChallengeScaffDown(preset.challenge.scaffolding?.down || '')
  setters.setChallengeScaffUp(preset.challenge.scaffolding?.up || '')

  setters.setEngageGoal(preset.engage.goal)
  setters.setEngageGameName(preset.engage.game.name)
  setters.setEngageGameDesc(preset.engage.game.description)
  setters.setEngageRules(preset.engage.game.rules.join('\n'))
  setters.setEngageScaffDown(preset.engage.game.scaffolding?.down || '')
  setters.setEngageScaffUp(preset.engage.game.scaffolding?.up || '')
  setters.setEngageVariation(preset.engage.variation)
  setters.setEngageFeedback((preset.engage.feedback || []).join('\n'))

  setters.setWrapupFlow(preset.wrapup.flow.join('\n'))
  setters.setWrapupMeta(preset.wrapup.metaQuestion)
  setters.setWrapupNext(preset.wrapup.nextPreview)
  setters.setWrapupSafety(preset.wrapup.safetyNote)
}

function buildAceLesson(values) {
  const {
    preset,
    introMinutes,
    acquireMinutes,
    challengeMinutes,
    engageMinutes,
    wrapupMinutes,
    introFlow,
    introMeta,
    acquireGoal,
    acquireDrills,
    acquireFeedback,
    challengeGoal,
    challengeMissions,
    challengeFeedback,
    challengeScaffDown,
    challengeScaffUp,
    engageGoal,
    engageGameName,
    engageGameDesc,
    engageRules,
    engageScaffDown,
    engageScaffUp,
    engageVariation,
    engageFeedback,
    wrapupFlow,
    wrapupMeta,
    wrapupNext,
    wrapupSafety,
  } = values

  const minutes = {
    intro: clampNum(introMinutes, 1, 40, preset.intro.minutes),
    acquire: clampNum(acquireMinutes, 1, 40, preset.acquire.minutes),
    challenge: clampNum(challengeMinutes, 1, 40, preset.challenge.minutes),
    engage: clampNum(engageMinutes, 1, 40, preset.engage.minutes),
    wrapup: clampNum(wrapupMinutes, 1, 40, preset.wrapup.minutes),
  }

  return {
    totalMinutes: minutes.intro + minutes.acquire + minutes.challenge + minutes.engage + minutes.wrapup,
    intro: {
      minutes: minutes.intro,
      flow: splitLines(introFlow).length ? splitLines(introFlow) : preset.intro.flow,
      metaQuestion: introMeta || preset.intro.metaQuestion,
    },
    acquire: {
      minutes: minutes.acquire,
      goal: acquireGoal || preset.acquire.goal,
      drills: parseNamedList(acquireDrills, preset.acquire.drills).map((drill) => ({
        name: drill.name,
        description: drill.description,
        scaffolding: {
          down: '거리 축소, 시도 횟수 축소',
          up: '거리/속도 증가, 교대 간격 단축',
        },
      })),
      feedback: splitLines(acquireFeedback).length
        ? splitLines(acquireFeedback)
        : preset.acquire.feedback || [],
    },
    challenge: {
      minutes: minutes.challenge,
      goal: challengeGoal || preset.challenge.goal,
      missions: parseNamedList(challengeMissions, preset.challenge.missions).map((mission, idx) => ({
        ...mission,
        minutes: idx === 0 ? Math.max(1, Math.floor(minutes.challenge / 3)) : 1,
      })),
      scaffolding: {
        down: challengeScaffDown || preset.challenge.scaffolding?.down,
        up: challengeScaffUp || preset.challenge.scaffolding?.up,
      },
      feedback: splitLines(challengeFeedback).length
        ? splitLines(challengeFeedback)
        : preset.challenge.feedback || [],
    },
    engage: {
      minutes: minutes.engage,
      goal: engageGoal || preset.engage.goal,
      game: {
        name: engageGameName || preset.engage.game.name,
        description: engageGameDesc || preset.engage.game.description,
        rules: splitLines(engageRules).length ? splitLines(engageRules) : preset.engage.game.rules,
        scaffolding: {
          down: engageScaffDown || preset.engage.game.scaffolding?.down,
          up: engageScaffUp || preset.engage.game.scaffolding?.up,
        },
      },
      variation: engageVariation || preset.engage.variation,
      feedback: splitLines(engageFeedback).length
        ? splitLines(engageFeedback)
        : preset.engage.feedback || [],
    },
    wrapup: {
      minutes: minutes.wrapup,
      flow: splitLines(wrapupFlow).length ? splitLines(wrapupFlow) : preset.wrapup.flow,
      metaQuestion: wrapupMeta || preset.wrapup.metaQuestion,
      nextPreview: wrapupNext || preset.wrapup.nextPreview,
      safetyNote: wrapupSafety || preset.wrapup.safetyNote,
    },
  }
}

export default function AlternativeActivityModal({ open, lesson, onClose, onSave }) {
  const [selectedPreset, setSelectedPreset] = useState('marker')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [name, setName] = useState('')
  const [source, setSource] = useState('')
  const [difficulty, setDifficulty] = useState('2')
  const [durationMin, setDurationMin] = useState('40')
  const [space, setSpace] = useState('')
  const [groupMin, setGroupMin] = useState('2')
  const [groupMax, setGroupMax] = useState('30')
  const [equipment, setEquipment] = useState('공')
  const [fmsCategories, setFmsCategories] = useState('')
  const [fmsSkills, setFmsSkills] = useState('')
  const [fitnessComponents, setFitnessComponents] = useState('')

  const [introMinutes, setIntroMinutes] = useState('5')
  const [acquireMinutes, setAcquireMinutes] = useState('10')
  const [challengeMinutes, setChallengeMinutes] = useState('10')
  const [engageMinutes, setEngageMinutes] = useState('8')
  const [wrapupMinutes, setWrapupMinutes] = useState('7')
  const [introFlow, setIntroFlow] = useState('')
  const [introMeta, setIntroMeta] = useState('')
  const [acquireGoal, setAcquireGoal] = useState('')
  const [acquireDrills, setAcquireDrills] = useState('')
  const [acquireFeedback, setAcquireFeedback] = useState('')
  const [challengeGoal, setChallengeGoal] = useState('')
  const [challengeMissions, setChallengeMissions] = useState('')
  const [challengeFeedback, setChallengeFeedback] = useState('')
  const [challengeScaffDown, setChallengeScaffDown] = useState('')
  const [challengeScaffUp, setChallengeScaffUp] = useState('')
  const [engageGoal, setEngageGoal] = useState('')
  const [engageGameName, setEngageGameName] = useState('')
  const [engageGameDesc, setEngageGameDesc] = useState('')
  const [engageRules, setEngageRules] = useState('')
  const [engageScaffDown, setEngageScaffDown] = useState('')
  const [engageScaffUp, setEngageScaffUp] = useState('')
  const [engageVariation, setEngageVariation] = useState('')
  const [engageFeedback, setEngageFeedback] = useState('')
  const [wrapupFlow, setWrapupFlow] = useState('')
  const [wrapupMeta, setWrapupMeta] = useState('')
  const [wrapupNext, setWrapupNext] = useState('')
  const [wrapupSafety, setWrapupSafety] = useState('')

  const { loading: aiLoading, error: aiError, result: aiResult, generate: aiGenerate, reset: aiReset } = useAI()

  const handleAIRecommend = () => {
    const prompt = buildAlternativeRecommendPrompt(lesson)
    aiGenerate(prompt)
  }

  useEffect(() => {
    if (!open) return
    const preset = QUICK_PRESETS[selectedPreset] ?? QUICK_PRESETS.marker
    const setters = {
      setName: setName,
      setSource: setSource,
      setDifficulty: setDifficulty,
      setDurationMin: setDurationMin,
      setSpace: setSpace,
      setGroupMin: setGroupMin,
      setGroupMax: setGroupMax,
      setEquipment: setEquipment,
      setFmsCategories: setFmsCategories,
      setFmsSkills: setFmsSkills,
      setFitnessComponents: setFitnessComponents,
      setIntroMinutes: setIntroMinutes,
      setAcquireMinutes: setAcquireMinutes,
      setChallengeMinutes: setChallengeMinutes,
      setEngageMinutes: setEngageMinutes,
      setWrapupMinutes: setWrapupMinutes,
      setIntroFlow: setIntroFlow,
      setIntroMeta: setIntroMeta,
      setAcquireGoal: setAcquireGoal,
      setAcquireDrills: setAcquireDrills,
      setAcquireFeedback: setAcquireFeedback,
      setChallengeGoal: setChallengeGoal,
      setChallengeMissions: setChallengeMissions,
      setChallengeFeedback: setChallengeFeedback,
      setChallengeScaffDown: setChallengeScaffDown,
      setChallengeScaffUp: setChallengeScaffUp,
      setEngageGoal: setEngageGoal,
      setEngageGameName: setEngageGameName,
      setEngageGameDesc: setEngageGameDesc,
      setEngageRules: setEngageRules,
      setEngageScaffDown: setEngageScaffDown,
      setEngageScaffUp: setEngageScaffUp,
      setEngageVariation: setEngageVariation,
      setEngageFeedback: setEngageFeedback,
      setWrapupFlow: setWrapupFlow,
      setWrapupMeta: setWrapupMeta,
      setWrapupNext: setWrapupNext,
      setWrapupSafety: setWrapupSafety,
    }

    applyPresetToState(setters, selectedPreset)
    setName(lesson?.title ? `${lesson.title} 대체활동` : preset.name)
    setShowAdvanced(false)
  }, [open, selectedPreset, lesson])

  const presetKeys = Object.keys(QUICK_PRESETS)
  const activePreset = QUICK_PRESETS[selectedPreset]

  const totalMinutes = (() => {
    const sum =
      toMinutes(introMinutes, activePreset.intro.minutes) +
      toMinutes(acquireMinutes, activePreset.acquire.minutes) +
      toMinutes(challengeMinutes, activePreset.challenge.minutes) +
      toMinutes(engageMinutes, activePreset.engage.minutes) +
      toMinutes(wrapupMinutes, activePreset.wrapup.minutes)

    return sum
  })()

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!name.trim()) return

    const preset = QUICK_PRESETS[selectedPreset] ?? QUICK_PRESETS.marker
    const aceLesson = buildAceLesson({
      preset,
      introMinutes,
      acquireMinutes,
      challengeMinutes,
      engageMinutes,
      wrapupMinutes,
      introFlow,
      introMeta,
      acquireGoal,
      acquireDrills,
      acquireFeedback,
      challengeGoal,
      challengeMissions,
      challengeFeedback,
      challengeScaffDown,
      challengeScaffUp,
      engageGoal,
      engageGameName,
      engageGameDesc,
      engageRules,
      engageScaffDown,
      engageScaffUp,
      engageVariation,
      engageFeedback,
      wrapupFlow,
      wrapupMeta,
      wrapupNext,
      wrapupSafety,
    })

    onSave({
      name: name.trim(),
      source: source || preset.source,
      acePhase: lesson?.acePhase || 'A',
      difficulty: Number(difficulty) || 2,
      sourceTag: 'custom',
      space: parseCommaList(space),
      groupSize: {
        min: clampNum(groupMin, 1, 200, 2),
        max: clampNum(groupMax, 1, 200, 30),
      },
      durationMin: clampNum(durationMin, 15, 60, 40),
      equipment: parseCommaList(equipment),
      fmsCategories: parseCommaList(fmsCategories),
      fmsSkills: parseCommaList(fmsSkills),
      fitnessComponents: parseCommaList(fitnessComponents),
      verified: true,
      aceLesson,
      flow: [
        `도입: ${introFlow || `수업 목적 공유와 안전 규칙`}`,
        `전개: ${acquireGoal || '기본 동작 → 도전 → 적용'}`,
        `마무리: ${wrapupMeta || '성찰 포인트 확인'}`,
      ],
    })

    onClose()
  }

  const resetAndClose = () => {
    setShowAdvanced(false)
    onClose()
  }

  if (!open || !lesson) return null

  return (
    <Modal onClose={resetAndClose} maxWidth="max-w-2xl">
      <div className="max-h-[86vh] overflow-y-auto -mx-6 px-6 -my-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">ACE 대체 활동 추가</h3>
            <p className="text-xs text-gray-500">
              {lesson.lesson}차시: {lesson.title}
            </p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-gray-100 text-gray-400"
            aria-label="모달 닫기"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex gap-2 flex-wrap">
          {presetKeys.map((presetId) => (
            <button
              key={presetId}
              type="button"
              onClick={() => setSelectedPreset(presetId)}
              className={`px-2 py-1.5 rounded-full text-[11px] border ${
                selectedPreset === presetId
                  ? 'bg-[#7C9EF5] text-white border-[#7C9EF5]'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {QUICK_PRESETS[presetId].label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="ml-auto px-2 py-1.5 rounded-full text-[11px] border border-gray-300 bg-white text-gray-600"
          >
            {showAdvanced ? '간단 편집 닫기' : '고급 편집'}
          </button>
        </div>

        {/* AI 추천 섹션 */}
        <div className="mb-4">
          <AIButton
            label="AI 대체활동 추천"
            loading={aiLoading}
            onClick={handleAIRecommend}
          />
          <AIResponseCard
            text={aiResult || ''}
            loading={aiLoading}
            error={aiError}
            onClose={aiReset}
          />
        </div>

        <p className="text-xs text-gray-500 mb-4">
          총 ACE 시간: {totalMinutes}분(권장 40분)
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3">
            <h4 className="text-xs font-bold text-gray-700">빠른 입력</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="활동명" required>
                <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 원마커 회수 챌린지" />
              </Field>
              <Field label="출처/메모">
                <TextInput value={source} onChange={(event) => setSource(event.target.value)} placeholder="교재/자료명 또는 비고" />
              </Field>
              <Field label="A 목표 (기본)"><TextInput value={acquireGoal} onChange={(event) => setAcquireGoal(event.target.value)} placeholder="예: 던지기와 받기를 정확히 3회 반복한다." /></Field>
              <Field label="C 목표 (도전)"><TextInput value={challengeGoal} onChange={(event) => setChallengeGoal(event.target.value)} placeholder="예: 호루라기 전 역할 교체 후에도 흐름 유지" /></Field>
              <Field label="E 목표 (게임)"><TextInput value={engageGoal} onChange={(event) => setEngageGoal(event.target.value)} placeholder="예: 회수 동선을 게임에 적용한다." /></Field>
              <Field label="마무리 질문"><TextInput value={wrapupMeta} onChange={(event) => setWrapupMeta(event.target.value)} placeholder="예: 어떤 순간이 가장 안정적이었나?" /></Field>
              <Field label="도입 메타 질문"><TextInput value={introMeta} onChange={(event) => setIntroMeta(event.target.value)} placeholder="메타인지 발문" /></Field>
            </div>
          </section>

          {showAdvanced && (
            <>
              <section className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3">
                <h4 className="text-xs font-bold text-gray-700">추가 설정</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="난이도">
                    <select
                      value={difficulty}
                      onChange={(event) => setDifficulty(event.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {Object.entries(DIFFICULTY_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="총 수업시간(분)">
                    <NumInput value={durationMin} onChange={(event) => setDurationMin(event.target.value)} suffix="분" />
                  </Field>
                  <Field label="장소(쉼표 구분)">
                    <TextInput value={space} onChange={(event) => setSpace(event.target.value)} placeholder="운동장, 체육관, 교실" />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="최소 인원">
                      <NumInput value={groupMin} onChange={(event) => setGroupMin(event.target.value)} suffix="명" />
                    </Field>
                    <Field label="최대 인원">
                      <NumInput value={groupMax} onChange={(event) => setGroupMax(event.target.value)} suffix="명" />
                    </Field>
                  </div>
                  <Field label="준비물(쉼표 구분)">
                    <TextInput
                      value={equipment}
                      onChange={(event) => setEquipment(event.target.value)}
                      placeholder="공, 원마커, 라인콘"
                    />
                  </Field>
                  <Field label="FMS/체력요소(쉼표 구분)">
                    <TextInput value={fmsCategories} onChange={(event) => setFmsCategories(event.target.value)} placeholder="조작" />
                    <div className="h-2" />
                    <TextInput value={fmsSkills} onChange={(event) => setFmsSkills(event.target.value)} placeholder="던지기, 받기" />
                    <div className="h-2" />
                    <TextInput value={fitnessComponents} onChange={(event) => setFitnessComponents(event.target.value)} placeholder="협응성, 민첩성" />
                  </Field>
                </div>
              </section>

              <section className="rounded-xl border border-blue-100 bg-blue-50 p-3 space-y-3">
                <h4 className="text-xs font-bold text-blue-700">시간 배분</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="도입 시간(분)">
                    <NumInput value={introMinutes} onChange={(event) => setIntroMinutes(event.target.value)} />
                  </Field>
                  <Field label="A 시간(분)">
                    <NumInput value={acquireMinutes} onChange={(event) => setAcquireMinutes(event.target.value)} />
                  </Field>
                  <Field label="C 시간(분)">
                    <NumInput value={challengeMinutes} onChange={(event) => setChallengeMinutes(event.target.value)} />
                  </Field>
                  <Field label="E 시간(분)">
                    <NumInput value={engageMinutes} onChange={(event) => setEngageMinutes(event.target.value)} />
                  </Field>
                  <Field label="마무리 시간(분)">
                    <NumInput value={wrapupMinutes} onChange={(event) => setWrapupMinutes(event.target.value)} />
                  </Field>
                </div>
              </section>
            </>
          )}

          {showAdvanced && (
            <section className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3">
              <h4 className="text-xs font-bold text-gray-700">고급: 단계별 상세</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="도입 흐름 (줄바꿈)">
                  <TextArea value={introFlow} onChange={(event) => setIntroFlow(event.target.value)} />
                </Field>
                <Field label="A 드릴 (형식: 이름:설명)">
                  <TextArea value={acquireDrills} onChange={(event) => setAcquireDrills(event.target.value)} />
                </Field>
                <Field label="C 미션 (형식: 이름:설명)">
                  <TextArea value={challengeMissions} onChange={(event) => setChallengeMissions(event.target.value)} />
                </Field>
                <Field label="E 게임명/설명">
                  <TextInput value={engageGameName} onChange={(event) => setEngageGameName(event.target.value)} placeholder="게임명" />
                  <div className="h-2" />
                  <TextInput value={engageGameDesc} onChange={(event) => setEngageGameDesc(event.target.value)} placeholder="게임 설명" />
                </Field>
                <Field label="E 규칙 (줄바꿈)">
                  <TextArea value={engageRules} onChange={(event) => setEngageRules(event.target.value)} />
                </Field>
                <Field label="마무리 흐름 (줄바꿈)">
                  <TextArea value={wrapupFlow} onChange={(event) => setWrapupFlow(event.target.value)} />
                </Field>
                <Field label="다음 차시 예고">
                  <TextInput value={wrapupNext} onChange={(event) => setWrapupNext(event.target.value)} />
                </Field>
                <Field label="안전/유의사항">
                  <TextInput value={wrapupSafety} onChange={(event) => setWrapupSafety(event.target.value)} />
                </Field>
                <Field label="A 피드백(줄바꿈)">
                  <TextArea value={acquireFeedback} onChange={(event) => setAcquireFeedback(event.target.value)} />
                </Field>
                <Field label="C 피드백(줄바꿈)">
                  <TextArea value={challengeFeedback} onChange={(event) => setChallengeFeedback(event.target.value)} />
                </Field>
                <Field label="C 스캐폴딩(완화)">
                  <TextInput value={challengeScaffDown} onChange={(event) => setChallengeScaffDown(event.target.value)} />
                </Field>
                <Field label="C 스캐폴딩(확장)">
                  <TextInput value={challengeScaffUp} onChange={(event) => setChallengeScaffUp(event.target.value)} />
                </Field>
                <Field label="E 스캐폴딩(완화)">
                  <TextInput value={engageScaffDown} onChange={(event) => setEngageScaffDown(event.target.value)} />
                </Field>
                <Field label="E 스캐폴딩(확장)">
                  <TextInput value={engageScaffUp} onChange={(event) => setEngageScaffUp(event.target.value)} />
                </Field>
                <Field label="E 변형 아이디어">
                  <TextInput value={engageVariation} onChange={(event) => setEngageVariation(event.target.value)} />
                </Field>
                <Field label="E 피드백(줄바꿈)">
                  <TextArea value={engageFeedback} onChange={(event) => setEngageFeedback(event.target.value)} />
                </Field>
              </div>
            </section>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={resetAndClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 bg-gray-100 hover:bg-gray-200"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm bg-[#7C9EF5] text-white hover:bg-[#6B8BE6]"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
