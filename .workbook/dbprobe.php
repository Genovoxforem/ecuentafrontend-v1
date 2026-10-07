<?php
define('NOLOGIN', 1);
require 'C:/wamp64/www/ecuenta9/htdocs/master.inc.php';
require_once DOL_DOCUMENT_ROOT.'/commande/class/commandestats.class.php';
// emulate an admin user context
$user->fetch(1);
$stats = new CommandeStats($db, 0, 'customer', 0, 0, 0);
$nb = $stats->getNbByMonth(2026);
echo 'getNbByMonth(2026): '; print_r($nb);
$am = $stats->getAmountByMonth(2026);
echo 'getAmountByMonth(2026): '; print_r(array_slice($am, 0, 3));
$all = $stats->getAllByYear();
echo 'getAllByYear: '; print_r($all);
echo "where={$stats->where}\n";
