"use client"

import React from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, Shield, Lock, Eye, Database, Users, Building, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-mesh">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-engineering-blue rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">土</span>
              </div>
              <div>
                <h1 className="font-bold text-xl text-engineering-blue">
                  土木設計業務プラットフォーム
                </h1>
                <p className="text-sm text-gray-600">Civil Engineering Platform</p>
              </div>
            </div>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                トップページに戻る
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <Shield className="w-12 h-12 text-engineering-blue mr-4" />
              <h1 className="text-4xl font-bold text-gray-900">プライバシーポリシー</h1>
            </div>
            <p className="text-lg text-gray-600">
              土木設計業務プラットフォームにおける個人情報の取り扱いについて
            </p>
            <p className="text-sm text-gray-500 mt-2">
              最終更新日: 2024年9月14日
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2 text-engineering-blue" />
                1. 事業者の名称
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                土木設計業務プラットフォーム運営事務局（以下「当社」といいます。）は、
                土木設計業務プラットフォーム（以下「本サービス」といいます。）において、
                ユーザーの個人情報を以下のとおり取り扱います。
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2 text-engineering-blue" />
                2. 個人情報の定義
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                個人情報とは、個人情報保護法にいう「個人情報」を指すものとし、
                生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日、住所、電話番号、
                連絡先その他の記述等により特定の個人を識別できる情報及び容貌、指紋、声紋にかかるデータ、
                及び健康保険証の保険者番号などの当該情報単体から特定の個人を識別できる情報（個人識別情報）を指します。
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-engineering-blue" />
                3. 個人情報の収集方法
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                当社は、ユーザーが利用登録をする際に氏名、生年月日、住所、電話番号、メールアドレス、
                銀行口座番号、クレジットカード番号、運転免許証番号などの個人情報をお尋ねすることがあります。
                また、ユーザーと提携先などとの間でなされたユーザーの個人情報を含む取引記録や決済に関する情報を、
                当社の提携先（情報提供元、広告主、広告配信先などを含みます。以下、「提携先」といいます。）などから収集することがあります。
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-engineering-blue" />
                4. 個人情報を収集・利用する目的
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                当社が個人情報を収集・利用する目的は、以下のとおりです。
              </p>
              <ul>
                <li>本サービスの提供・運営のため</li>
                <li>ユーザーからのお問い合わせに回答するため（本人確認を行うことを含む）</li>
                <li>ユーザーが利用中のサービスの新機能、更新情報、キャンペーン等及び当社が提供する他のサービスの案内のメールを送付するため</li>
                <li>メンテナンス、重要なお知らせなど必要に応じたご連絡のため</li>
                <li>利用規約に違反したユーザーや、不正・不当な目的でサービスを利用しようとするユーザーの特定をし、ご利用をお断りするため</li>
                <li>ユーザーにご自身の登録情報の閲覧・変更・削除・ご利用状況の閲覧を行っていただくため</li>
                <li>有料サービスにおいて、ユーザーに利用料金を請求するため</li>
                <li>上記の利用目的に付随する目的</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="w-5 h-5 mr-2 text-engineering-blue" />
                5. 利用目的の変更
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                当社は、利用目的が変更前と関連性を有すると合理的に認められる場合に限り、
                個人情報の利用目的を変更するものとします。
                利用目的の変更を行った場合には、変更後の目的について、当社所定の方法により、
                ユーザーに通知し、または本ウェブサイト上に公表するものとします。
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2 text-engineering-blue" />
                6. 個人情報の第三者提供
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                当社は、次に掲げる場合を除いて、あらかじめユーザーの同意を得ることなく、
                第三者に個人情報を提供することはありません。ただし、個人情報保護法その他の法令で認められる場合を除きます。
              </p>
              <ul>
                <li>人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき</li>
                <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難であるとき</li>
                <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、本人の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがあるとき</li>
                <li>予め次の事項を告知あるいは公表し、かつ当社が個人情報保護委員会に届出をしたとき</li>
              </ul>
              <p>
                前項の定めにかかわらず、次に掲げる場合には、当該情報の提供先は第三者に該当しないものとします。
              </p>
              <ul>
                <li>当社が利用目的の達成に必要な範囲内において個人情報の取扱いの全部または一部を委託する場合</li>
                <li>合併その他の事由による事業の承継に伴って個人情報が提供される場合</li>
                <li>個人情報を特定の者との間で共同して利用する場合であって、その旨並びに共同して利用される個人情報の項目、共同して利用する者の範囲、利用する者の利用目的および当該個人情報の管理について責任を有する者の氏名または名称について、あらかじめ本人に通知し、または本人が容易に知り得る状態に置いた場合</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="w-5 h-5 mr-2 text-engineering-blue" />
                7. 個人情報の開示
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                当社は、本人から個人情報の開示を求められたときは、本人に対し、遅滞なくこれを開示します。
                ただし、開示することにより次のいずれかに該当する場合は、その全部または一部を開示しないこともあり、
                開示しない決定をした場合には、その旨を遅滞なく通知します。
              </p>
              <ul>
                <li>本人または第三者の生命、身体、財産その他の権利利益を害するおそれがある場合</li>
                <li>当社の業務の適正な実施に著しい支障を及ぼすおそれがある場合</li>
                <li>その他法令に違反することとなる場合</li>
              </ul>
              <p>
                前項の定めにかかわらず、履歴情報および特性情報などの個人情報以外の情報については、原則として開示いたしません。
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2 text-engineering-blue" />
                8. 個人情報の訂正および削除
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                ユーザーは、当社の保有する自己の個人情報が誤った情報である場合には、
                当社が定める手続により、当社に対して個人情報の訂正、追加または削除（以下、「訂正等」といいます。）を請求することができます。
              </p>
              <p>
                当社は、ユーザーから前項の請求を受けてその請求に理由があると判断した場合には、
                遅滞なく、当該個人情報の訂正等を行うものとします。
              </p>
              <p>
                当社は、前項の規定に基づき訂正等を行った場合、または訂正等を行わない旨の決定をしたときは遅滞なく、
                これをユーザーに通知します。
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="w-5 h-5 mr-2 text-engineering-blue" />
                9. 個人情報の利用停止等
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                当社は、本人から、個人情報が、利用目的の範囲を超えて取り扱われているという理由、
                または不正の手段により取得されたものであるという理由により、その利用の停止または消去（以下、「利用停止等」といいます。）を求められた場合には、
                遅滞なく必要な調査を行います。
              </p>
              <p>
                前項の調査結果に基づき、その請求に理由があると判断した場合には、遅滞なく、当該個人情報の利用停止等を行います。
              </p>
              <p>
                当社は、前項の規定に基づき利用停止等を行った場合、または利用停止等を行わない旨の決定をしたときは、遅滞なく、これをユーザーに通知します。
              </p>
              <p>
                前2項にかかわらず、利用停止等に多額の費用を有する場合その他利用停止等を行うことが困難な場合であって、
                ユーザーの権利利益を保護するために必要なこれに代わるべき措置をとれる場合は、この代替策を講じるものとします。
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2 text-engineering-blue" />
                10. プライバシーポリシーの変更
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                本ポリシーの内容は、法令その他本ポリシーに別段の定めのある事項を除いて、
                ユーザーに通知することなく、変更することができるものとします。
                当社が別途定める場合を除いて、変更後のプライバシーポリシーは、
                本ウェブサイトに掲載したときから効力を生じるものとします。
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-engineering-blue" />
                11. お問い合わせ窓口
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                本ポリシーに関するお問い合わせは、下記の窓口までお願いいたします。
              </p>
              <div className="bg-gray-50 p-6 rounded-lg mt-4">
                <p className="font-semibold">土木設計業務プラットフォーム運営事務局</p>
                <p>Email: privacy@civil-engineering-platform.com</p>
                <p>Tel: 03-1234-5678</p>
                <p>受付時間: 平日 9:00-18:00</p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-engineering-blue" />
                12. セキュリティについて
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                当社は、ユーザーの個人情報を保護するため、以下のセキュリティ対策を実施しています。
              </p>
              <ul>
                <li>SSL/TLS暗号化による通信の保護</li>
                <li>データベースの暗号化</li>
                <li>アクセス制御と認証システム</li>
                <li>定期的なセキュリティ監査</li>
                <li>従業員へのセキュリティ教育</li>
                <li>物理的セキュリティ対策</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2 text-engineering-blue" />
                13. Cookieの使用について
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                本サービスでは、ユーザーの利便性向上のため、Cookieを使用することがあります。
                Cookieは、ウェブサイトがユーザーのコンピュータに保存する小さなテキストファイルです。
              </p>
              <p>
                当社が使用するCookieの種類：
              </p>
              <ul>
                <li>必須Cookie: サービスの基本機能に必要なCookie</li>
                <li>機能Cookie: ユーザーの設定や選択を記憶するCookie</li>
                <li>分析Cookie: サービスの利用状況を分析するためのCookie</li>
                <li>広告Cookie: ユーザーに関連する広告を表示するためのCookie</li>
              </ul>
              <p>
                ユーザーは、ブラウザの設定によりCookieの使用を無効にすることができますが、
                一部の機能が利用できなくなる場合があります。
              </p>
            </CardContent>
          </Card>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              個人情報の取り扱いに関するご質問やご相談がございましたら、お気軽にお問い合わせください。
            </p>
            <div className="bg-engineering-blue/5 p-6 rounded-lg">
              <p className="font-semibold text-engineering-blue">個人情報保護管理者</p>
              <p>土木設計業務プラットフォーム運営事務局</p>
              <p>Email: privacy@civil-engineering-platform.com</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
