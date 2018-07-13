/**
 * Created by Linqy on 2018\7\4 0004.
 */
const mongodb = require('mongodb'),
    ObjectId = mongodb.ObjectId;
const S_Rule = require('./lib/Rule');

const ItemsOpts =
    {
        _id: {type: ObjectId},
        battle_mode: {type: Number}, //战场模式
        match_times: {type: Number}, //累计：总场次
        match_victory: {type: Number}, //累计：胜利场次
        testDate: {type: Date},

        total_die: {type: Number}, //累计：玩家死亡数
        total_fj_dead: {type: Number}, //累计：副将死亡次数
        total_soldier_dead: {type: Number}, //累计：士兵死亡次数
        total_kill_player: {type: Number}, //累计：主将副将士兵击杀主将数
        total_kill_adjutant: {type: Number}, //累计：主副将士兵击杀副将数
        total_kill_soldier: {type: Number}, //累计：主将副将士兵击杀士兵数
        total_kill_boss: {type: Number}, //累计：主将副将士兵击杀boss数
        total_dmg_player: {type: Number}, //累计：主将输出伤害(对主将副将士兵boss)
        total_dmg_adjutant: {type: Number}, //累计：副将输出伤害
        total_dmg_soldier: {type: Number}, //累计：士兵输出伤害
        total_dmg_to_player: {type: Number}, //累计：主将对主将伤害(包含使用武器和使用器械)
        total_dmg_to_adjutant: {type: Number}, //累计：主将对副将伤害
        total_dmg_to_soldier: {type: Number}, //累计：主将对士兵伤害
        total_dmg_to_boss: {type: Number}, //累计：主将对boss伤害
        total_be_dmg_player: {type: Number}, //累计：主将受到伤害
        total_be_dmg_adjutant: {type: Number}, //累计：副将受到伤害
        total_be_dmg_soldier: {type: Number}, //累计：士兵受到伤害
        total_kill_die: {type: Number}, //累计：玩家一击毙命其它玩家次数
        total_execute: {type: Number}, //累计：处决
        total_rescue: {type: Number}, //累计：营救
        total_assists: {type: Number}, //累计：玩家助攻
        total_hit_down: {type: Number}, //累计：玩家击倒
        total_occupy: {type: Number}, //累计：玩家占领数
        total_experience_player: {type: Number}, //累计：主将经验
        total_experience_soldier: {type: Number}, //累计：士兵经验
        total_experience_adjutant: {type: Number}, //累计：副将经验
        total_prestige: {type: Number}, //累计：声望
        total_copper: {type: Number}, //累计：铜币
        total_exploit: {type: Number}, //累计：军功
        total_mvp: {type: Number}, //累计：mvp
        total_game_time: {type: Number}, //累计：游戏时间(分钟)
        total_score: {type: Number}, //累计：得分

        max_kill: {type: Number}, //最大：主将副将士兵击杀主将副将士兵boss的数量
        max_dmg: {type: Number}, //最大：主将副将士兵(对主将副将士兵)造成最高伤害
        max_be_dmg: {type: Number}, //最大：主将副将士兵受到最高伤害
        max_kill_continue: {type: Number}, //最大：连斩数
        max_execute: {type: Number}, //最大：处决数
        max_rescue: {type: Number}, //最大：救援数
        max_occupy: {type: Number}, //最大：占领数
        max_assists: {type: Number}, //最大：玩家助攻数
        max_hit_down: {type: Number}, //最大：玩家击倒
        max_experience_player: {type: Number}, //最大：主将经验
        max_experience_soldier: {type: Number}, //最大：士兵经验
        max_experience_adjutant: {type: Number}, //最大：副将经验
        max_prestige: {type: Number}, //最大：声望
        max_copper: {type: Number}, //最大：铜币
        max_exploit: {type: Number}, //最大：军功
        max_score: {type: Number}, //最大：得分

        //装备带入战场次数统计数据
        use_ride: {type: Number}, //坐骑
        use_shot: {type: Number}, //投掷/单手
        use_shield: {type: Number}, //盾牌
        use_backflag: {type: Number}, //背旗
        use_fashion: {type: Number}, //主将时装
        use_onehand: {type: Number}, //单手类
        use_twohand: {type: Number}, //双手类
        use_shortspear: {type: Number}, //长杆类（可配盾）
        use_longspear: {type: Number}, //长杆类
        use_throwing: {type: Number}, //投掷类
        use_crossbow: {type: Number}, //弩类
        use_horsefashion: {type: Number}, //马匹时装
        use_archshort: {type: Number}, //短弓
        use_archlong: {type: Number}, //长弓

        //士兵统计数据
        soldiers: {
            type:
                [{
                    person_id: {type: Number}, //id
                    use_count: {type: Number}, //出场次数
                    win_count: {type: Number}, //胜利次数
                    totalexp: {type: Number}, //累计获得经验
                    totalscore: {type: Number}, //累计得分
                    totalkillnum: {type: Number}, //累计击杀主将/副将/士兵/大将
                    totaldmg: {type: Number}, //累计伤害
                    totalkillratio: {type: Number}, //累计击杀比
                    totaldie: {type: Number}, //累计死亡个数
                    totaldmgratio: {type: Number} //累计伤害比
                }]
        },
        //副将统计数据
        adjutants: {
            type:
                [{
                    person_id: {type: Number}, //id
                    use_count: {type: Number}, //出场次数
                    win_count: {type: Number} //胜利次数
                }]
        },

        contribute: { type: Number, default: 0} //贡献值
    };

const StatisticOpts ={
    name: 'statistic',
    data: {
        _id: {type: String},
        fightValue_MJ:{type: Number}, //战场模式
        fightValue_TF:{type: Number}, //战场模式
        fightValue:{type: Number}, //战场模式
        maxfightValue:{type: Number}, //战场模式
        totalSignin:{type: Number}, //战场模式
        contribute:{type: Number}, //战场模式
        items: {type: [ ItemsOpts] }
    }
};
const StatisticRule = S_Rule(StatisticOpts);
module.exports = StatisticRule;